#!/usr/bin/env node
// Minimal MCP stdio client to drive mcp-resonance tools for a demo run.
// Usage: run mcp-resonance server (node dist/index.js) in a separate terminal,
// then run this script: `node --input-type=module scripts/integration-demo.mjs`

import { spawn } from 'child_process';
import readline from 'readline';

// This script implements a tiny stdio client that can talk to a server following
// the MCP stdio protocol: send an Initialize (optional), ListTools, then CallTool
// requests. It's conservative and intended for local demos only.

let idCounter = 1;
function req(method, params = {}) {
  return { id: idCounter++, method, params };
}

async function run() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nIntegration demo client for mcp-resonance');
  console.log('Make sure the resonance server is running (node dist/index.js)');
  await new Promise((r) => rl.question('Press Enter to continue...', r));
  rl.close();

  // We'll spawn the server ourselves for convenience so demo is self-contained
  const server = spawn('node', ['dist/index.js'], { cwd: 'mcp-resonance', stdio: ['pipe', 'pipe', 'pipe'] });

  server.stderr.on('data', (b) => process.stderr.write(`[server] ${b.toString()}`));
  server.on('exit', (code) => console.log(`[server] exited ${code}`));

  const reader = readline.createInterface({ input: server.stdout });

  function send(obj) {
    server.stdin.write(JSON.stringify(obj) + '\n');
  }

  // Collect responses
  const pending = new Map();
  reader.on('line', (line) => {
    try {
      const msg = JSON.parse(line);
      if (msg.id) {
        const p = pending.get(msg.id);
        if (p) {
          p.resolve(msg);
          pending.delete(msg.id);
        }
      } else {
        console.log('[server message]', JSON.stringify(msg));
      }
    } catch (e) {
      console.log('[non-json]', line);
    }
  });

  function rpc(method, params) {
    const request = req(method, params);
    return new Promise((resolve, reject) => {
      pending.set(request.id, { resolve, reject });
      send(request);
      setTimeout(() => {
        if (pending.has(request.id)) {
          pending.delete(request.id);
          reject(new Error('timeout'));
        }
      }, 5000);
    });
  }

  try {
    console.log('\nListing tools...');
    const listResp = await rpc('tools/list', {});
    console.log(JSON.stringify(listResp, null, 2));

    // Demo sequence: record a few moments, check state, detect patterns, suggest next
    const moments = [
      { source: 'bridge', type: 'meditation', concepts: ['emergence', 'constraint'] },
      { source: 'bridge', type: 'meditation', concepts: ['resonance', 'absence'] },
      { source: 'consult', type: 'critique', concepts: ['patterns', 'constraints'] },
    ];

    for (const m of moments) {
      console.log('\nRecording moment:', m.concepts.join(', '));
      const rec = await rpc('tools/call', { name: 'record_ecosystem_moment', arguments: m });
      console.log(JSON.stringify(rec, null, 2));
    }

    console.log('\nAsking for ecosystem state...');
    const state = await rpc('tools/call', { name: 'observe_ecosystem_state', arguments: {} });
    console.log(String(state?.content?.[0]?.text || JSON.stringify(state)));

    console.log('\nDetecting emergent patterns...');
    const patterns = await rpc('tools/call', { name: 'detect_emergent_patterns', arguments: {} });
    console.log(String(patterns?.content?.[0]?.text || JSON.stringify(patterns)));

    console.log('\nRequesting suggestion...');
    const suggest = await rpc('tools/call', { name: 'suggest_next_synthesis', arguments: {} });
    console.log(String(suggest?.content?.[0]?.text || JSON.stringify(suggest)));

    console.log('\nDemo complete.');
  } catch (err) {
    console.error('Demo failed:', err);
  } finally {
    server.kill();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
