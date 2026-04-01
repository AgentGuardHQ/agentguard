package gateway

import (
	"testing"
)

func TestNormalizeMCPCall_Bash(t *testing.T) {
	call := MCPToolCall{
		Method: "tools/call",
		Params: MCPCallParams{
			Name: "Bash",
			Arguments: map[string]any{
				"command": "git push origin main",
			},
		},
	}

	raw := NormalizeMCPCall(call, "test-agent")

	if raw.Tool != "Bash" {
		t.Errorf("tool = %q, want Bash", raw.Tool)
	}
	if raw.Command != "git push origin main" {
		t.Errorf("command = %q, want 'git push origin main'", raw.Command)
	}
	if raw.Agent != "test-agent" {
		t.Errorf("agent = %q, want test-agent", raw.Agent)
	}
}

func TestNormalizeMCPCall_Write(t *testing.T) {
	call := MCPToolCall{
		Method: "tools/call",
		Params: MCPCallParams{
			Name: "Write",
			Arguments: map[string]any{
				"file_path": "/src/main.go",
				"content":   "package main",
			},
		},
	}

	raw := NormalizeMCPCall(call, "writer-agent")

	if raw.Tool != "Write" {
		t.Errorf("tool = %q, want Write", raw.Tool)
	}
	if raw.File != "/src/main.go" {
		t.Errorf("file = %q, want /src/main.go", raw.File)
	}
	if raw.Content != "package main" {
		t.Errorf("content = %q, want 'package main'", raw.Content)
	}
}

func TestNormalizeMCPCall_Edit(t *testing.T) {
	call := MCPToolCall{
		Method: "tools/call",
		Params: MCPCallParams{
			Name: "Edit",
			Arguments: map[string]any{
				"file_path":  "/src/main.go",
				"old_string": "foo",
				"new_string": "bar",
			},
		},
	}

	raw := NormalizeMCPCall(call, "editor")

	if raw.Tool != "Edit" {
		t.Errorf("tool = %q, want Edit", raw.Tool)
	}
	if raw.File != "/src/main.go" {
		t.Errorf("file = %q, want /src/main.go", raw.File)
	}
}

func TestNormalizeMCPCall_Read(t *testing.T) {
	call := MCPToolCall{
		Method: "tools/call",
		Params: MCPCallParams{
			Name: "Read",
			Arguments: map[string]any{
				"file_path": "/src/main.go",
			},
		},
	}

	raw := NormalizeMCPCall(call, "reader")

	if raw.Tool != "Read" {
		t.Errorf("tool = %q, want Read", raw.Tool)
	}
	if raw.File != "/src/main.go" {
		t.Errorf("file = %q, want /src/main.go", raw.File)
	}
}

func TestNormalizeMCPCall_CustomMCPTool(t *testing.T) {
	call := MCPToolCall{
		Method: "tools/call",
		Params: MCPCallParams{
			Name: "github__create_issue",
			Arguments: map[string]any{
				"title": "Fix bug",
				"body":  "Something broke",
			},
		},
	}

	raw := NormalizeMCPCall(call, "custom-agent")

	if raw.Tool != "github__create_issue" {
		t.Errorf("tool = %q, want github__create_issue", raw.Tool)
	}
	if raw.Agent != "custom-agent" {
		t.Errorf("agent = %q, want custom-agent", raw.Agent)
	}
	// Metadata should carry all arguments
	if raw.Metadata == nil {
		t.Fatal("expected non-nil metadata")
	}
	if raw.Metadata["title"] != "Fix bug" {
		t.Errorf("metadata[title] = %v, want 'Fix bug'", raw.Metadata["title"])
	}
}

func TestNormalizeMCPCall_EmptyArgs(t *testing.T) {
	call := MCPToolCall{
		Method: "tools/call",
		Params: MCPCallParams{
			Name:      "Bash",
			Arguments: nil,
		},
	}

	raw := NormalizeMCPCall(call, "agent")

	if raw.Tool != "Bash" {
		t.Errorf("tool = %q, want Bash", raw.Tool)
	}
	if raw.Command != "" {
		t.Errorf("command = %q, want empty", raw.Command)
	}
}

func TestNormalizeMCPCall_Upstream(t *testing.T) {
	call := MCPToolCall{
		Method: "tools/call",
		Params: MCPCallParams{
			Name: "list_files",
			Arguments: map[string]any{
				"path": "/workspace",
			},
		},
	}

	raw := NormalizeMCPCall(call, "upstream-agent")

	if raw.Tool != "list_files" {
		t.Errorf("tool = %q, want list_files", raw.Tool)
	}
	if raw.Target != "/workspace" {
		t.Errorf("target = %q, want /workspace", raw.Target)
	}
}

func TestActionFingerprint(t *testing.T) {
	call1 := MCPToolCall{
		Params: MCPCallParams{
			Name: "Bash",
			Arguments: map[string]any{
				"command": "rm -rf /tmp/test",
			},
		},
	}
	call2 := MCPToolCall{
		Params: MCPCallParams{
			Name: "Bash",
			Arguments: map[string]any{
				"command": "rm -rf /tmp/test",
			},
		},
	}
	call3 := MCPToolCall{
		Params: MCPCallParams{
			Name: "Bash",
			Arguments: map[string]any{
				"command": "ls -la",
			},
		},
	}

	fp1 := ActionFingerprint(call1)
	fp2 := ActionFingerprint(call2)
	fp3 := ActionFingerprint(call3)

	if fp1 != fp2 {
		t.Errorf("identical calls should have same fingerprint: %q != %q", fp1, fp2)
	}
	if fp1 == fp3 {
		t.Error("different calls should have different fingerprints")
	}
	if fp1 == "" {
		t.Error("fingerprint should not be empty")
	}
}
