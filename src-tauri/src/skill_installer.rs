use std::fs;
use std::path::PathBuf;

const MCP_SERVER_JS: &str = include_str!("../../src/mcp/dist/server.js");
const SKILL_MD: &str = include_str!("../resources/lunette-visualize.md");

pub fn install() {
    let home = match std::env::var("HOME") {
        Ok(h) => PathBuf::from(h),
        Err(_) => {
            eprintln!("Error: HOME environment variable not set.");
            std::process::exit(1);
        }
    };

    // Install MCP server → ~/.lunette/mcp/server.js
    let mcp_dir = home.join(".lunette").join("mcp");
    let mcp_path = mcp_dir.join("server.js");
    if let Err(e) = fs::create_dir_all(&mcp_dir) {
        eprintln!("Error creating {}: {e}", mcp_dir.display());
        std::process::exit(1);
    }
    if let Err(e) = fs::write(&mcp_path, MCP_SERVER_JS) {
        eprintln!("Error writing {}: {e}", mcp_path.display());
        std::process::exit(1);
    }

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let _ = fs::set_permissions(&mcp_path, fs::Permissions::from_mode(0o755));
    }

    // Install skill → ~/.claude/skills/lunette-visualize.md
    let skill_dir = home.join(".claude").join("skills");
    let skill_path = skill_dir.join("lunette-visualize.md");
    if let Err(e) = fs::create_dir_all(&skill_dir) {
        eprintln!("Error creating {}: {e}", skill_dir.display());
        std::process::exit(1);
    }
    if let Err(e) = fs::write(&skill_path, SKILL_MD) {
        eprintln!("Error writing {}: {e}", skill_path.display());
        std::process::exit(1);
    }

    println!("✓ MCP server installed → {}", mcp_path.display());
    println!("✓ Skill installed     → {}", skill_path.display());
    println!();
    println!("Add this to your project's .mcp.json (or ~/.claude.json for global):");
    println!();
    println!("  {{");
    println!("    \"mcpServers\": {{");
    println!("      \"lunette\": {{");
    println!("        \"type\": \"stdio\",");
    println!("        \"command\": \"node\",");
    println!("        \"args\": [\"{}\"]", mcp_path.display());
    println!("      }}");
    println!("    }}");
    println!("  }}");
}
