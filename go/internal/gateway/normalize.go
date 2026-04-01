package gateway

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"

	"github.com/AgentGuardHQ/agentguard/go/internal/action"
)

// MCPToolCall represents an incoming MCP JSON-RPC tools/call request.
type MCPToolCall struct {
	Method string        `json:"method"`
	Params MCPCallParams `json:"params"`
}

// MCPCallParams carries the tool name and arguments from a tools/call request.
type MCPCallParams struct {
	Name      string         `json:"name"`
	Arguments map[string]any `json:"arguments,omitempty"`
}

// NormalizeMCPCall translates an MCP tool call into a kernel-compatible RawAction.
// It extracts well-known parameters (command, file_path, content, target) into
// their dedicated RawAction fields and stores everything else in Metadata.
func NormalizeMCPCall(call MCPToolCall, agentName string) action.RawAction {
	raw := action.RawAction{
		Tool:     call.Params.Name,
		Agent:    agentName,
		Metadata: make(map[string]any),
	}

	args := call.Params.Arguments
	if args == nil {
		return raw
	}

	// Extract well-known fields
	if cmd, ok := args["command"].(string); ok {
		raw.Command = cmd
	}
	if fp, ok := args["file_path"].(string); ok {
		raw.File = fp
	}
	if content, ok := args["content"].(string); ok {
		raw.Content = content
	}
	if tgt, ok := args["target"].(string); ok {
		raw.Target = tgt
	}
	if branch, ok := args["branch"].(string); ok {
		raw.Branch = branch
	}

	// For tools that have a path but not file_path (e.g. upstream MCP tools)
	if raw.File == "" && raw.Target == "" {
		if p, ok := args["path"].(string); ok {
			raw.Target = p
		}
	}

	// Store all arguments in metadata for full transparency
	for k, v := range args {
		raw.Metadata[k] = v
	}

	return raw
}

// ActionFingerprint computes a deterministic hash of an MCP tool call for
// deduplication and runaway detection. Two identical calls produce the same
// fingerprint.
func ActionFingerprint(call MCPToolCall) string {
	// Deterministic serialization: tool name + sorted JSON of arguments
	data := struct {
		Name string         `json:"name"`
		Args map[string]any `json:"args,omitempty"`
	}{
		Name: call.Params.Name,
		Args: call.Params.Arguments,
	}
	b, err := json.Marshal(data)
	if err != nil {
		// Fallback to tool name only
		b = []byte(call.Params.Name)
	}
	h := sha256.Sum256(b)
	return fmt.Sprintf("%x", h[:8])
}
