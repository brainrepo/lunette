# Architettura del Sistema di Streaming Eventi

> Documento tecnico interno — ultimo aggiornamento: Marzo 2026

## Panoramica

Il sistema di streaming eventi gestisce **~2.4 milioni di eventi/giorno** attraverso una pipeline distribuita basata su Kafka, con garanzie di _at-least-once delivery_ e deduplicazione lato consumer.

L'architettura è stata progettata per supportare tre casi d'uso principali:

1. **Event sourcing** per il dominio ordini (write model)
2. **CQRS** con proiezioni materializzate su ClickHouse (read model)
3. **Notifiche real-time** via WebSocket e push notifications

---

## Stack Tecnologico

| Componente | Tecnologia | Versione | Note |
|---|---|---|---|
| Event Bus | Apache Kafka | 3.7.0 | 3 broker, RF=3 |
| Schema Registry | Confluent | 7.6.1 | Avro + backward compat |
| Stream Processing | Kafka Streams | 3.7.0 | Exactly-once semantics |
| Persistent Store | PostgreSQL | 16.2 | Logical replication |
| Analytics OLAP | ClickHouse | 24.1 | MergeTree engine |
| Cache | Redis Cluster | 7.2 | 6 nodi, 3 master + 3 replica |
| API Gateway | NGINX | 1.25 | Rate limiting, circuit breaker |
| Observability | Prometheus + Grafana | - | Alerting via PagerDuty |

## Topologia Kafka

Il cluster utilizza **12 partizioni** per i topic principali, con chiave di partizionamento basata su `tenant_id` per garantire ordinamento per-tenant:

```yaml
# kafka-topics.yml
topics:
  - name: orders.events
    partitions: 12
    replication-factor: 3
    config:
      retention.ms: 604800000        # 7 giorni
      cleanup.policy: delete
      min.insync.replicas: 2
      compression.type: zstd

  - name: payments.events
    partitions: 12
    replication-factor: 3
    config:
      retention.ms: 2592000000       # 30 giorni
      cleanup.policy: compact,delete
      min.insync.replicas: 2

  - name: notifications.commands
    partitions: 6
    replication-factor: 3
    config:
      retention.ms: 86400000         # 1 giorno
      max.message.bytes: 1048576     # 1 MB
```

## Consumer Groups

Ogni microservizio mantiene il proprio consumer group con offset tracking indipendente:

```typescript
// order-projection-consumer.ts
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';

interface OrderEvent {
  eventId: string;
  orderId: string;
  tenantId: string;
  type: 'OrderCreated' | 'OrderPaid' | 'OrderShipped' | 'OrderCancelled';
  payload: Record<string, unknown>;
  timestamp: number;
  version: number;
}

const registry = new SchemaRegistry({ host: 'http://schema-registry:8081' });

async function startConsumer(kafka: Kafka): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId: 'order-projection-v3',
    sessionTimeout: 30_000,
    heartbeatInterval: 10_000,
    maxWaitTimeInMs: 500,
    retry: { retries: 8, initialRetryTime: 300 },
  });

  await consumer.connect();
  await consumer.subscribe({
    topics: ['orders.events', 'payments.events'],
    fromBeginning: false,
  });

  await consumer.run({
    autoCommit: false,
    eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
      const event = await registry.decode(message.value!) as OrderEvent;

      // Deduplicazione basata su eventId
      if (await isProcessed(event.eventId)) {
        await consumer.commitOffsets([{
          topic, partition, offset: (Number(message.offset) + 1).toString(),
        }]);
        return;
      }

      await processEvent(event);
      await markProcessed(event.eventId);
      await consumer.commitOffsets([{
        topic, partition, offset: (Number(message.offset) + 1).toString(),
      }]);
    },
  });

  return consumer;
}
```

## Metriche di Performance

Le metriche chiave monitorate su Grafana:

- **p50 latency** (produce → consume): **~12ms**
- **p99 latency**: **~85ms**
- **Throughput medio**: **~28k eventi/minuto**
- **Consumer lag massimo tollerato**: **< 5000 messaggi**
- **Tasso di errore**: **< 0.01%** (con retry)

### Formula di capacity planning

Il calcolo per determinare il numero di partizioni necessarie:

```
partizioni = max(
  throughput_target / throughput_per_consumer,
  throughput_target / throughput_per_producer,
  num_consumers_nel_group
)
```

Con i nostri numeri attuali:
- Target: 50k eventi/min
- Throughput per consumer: ~8k eventi/min
- Consumer nel group: 6 istanze

→ **ceil(50000 / 8000) = 7**, arrotondato a **12** per headroom e bilanciamento.

---

## Gestione degli Errori

Il sistema implementa una strategia a tre livelli:

### Dead Letter Queue (DLQ)

```typescript
async function handleFailedMessage(
  message: KafkaMessage,
  error: Error,
  retryCount: number
): Promise<void> {
  if (retryCount >= MAX_RETRIES) {
    await producer.send({
      topic: `${originalTopic}.dlq`,
      messages: [{
        key: message.key,
        value: message.value,
        headers: {
          ...message.headers,
          'x-original-topic': originalTopic,
          'x-error-message': error.message,
          'x-retry-count': retryCount.toString(),
          'x-failed-at': new Date().toISOString(),
        },
      }],
    });

    metrics.dlqMessages.inc({ topic: originalTopic });
    logger.error({ orderId: message.key, error, retryCount },
      'Message sent to DLQ after max retries');
    return;
  }

  // Exponential backoff: 300ms, 600ms, 1.2s, 2.4s, ...
  const delay = 300 * Math.pow(2, retryCount);
  await sleep(delay);
  throw error; // KafkaJS will retry
}
```

### Circuit Breaker

Quando un servizio downstream non risponde, il circuit breaker si attiva dopo **5 fallimenti consecutivi** con un timeout di **30 secondi** prima del half-open state.

### Compensating Transactions

Per gli eventi di pagamento fallito, il sistema esegue automaticamente:

1. Rilascio dell'inventario riservato
2. Aggiornamento dello stato ordine a `cancelled`
3. Invio notifica all'utente
4. Emissione evento `OrderCompensated` per audit trail

---

## Note Operative

> **Attenzione**: il topic `payments.events` usa **compact+delete** policy.
> Non eliminare i record manualmente — il compaction preserva l'ultimo stato per chiave.

Per il monitoring, il dashboard Grafana principale è:
`grafana.internal/d/kafka-overview`

Gli alert PagerDuty si attivano quando:
- Consumer lag > 5000 per > 5 minuti
- Broker ISR shrink
- Under-replicated partitions > 0
