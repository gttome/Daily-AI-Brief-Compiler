// Code-mode host for the existing GitHub connector. Connector-omitted binary
// reads use the bounded immutable-public-URL helper in this same Work invocation.
// All Git mutations remain on the existing connector. Evaluate this function
// in the same outer Work task, passing its actually exposed tools object.
// It runs the deterministic Node publisher and answers only its four operations.
async function runD1GitHubWriterHost({tools, root, batchPath}) {
  const protocol = 'daily-compiler-d1-existing-writer-stdio-v1';
  const repository = 'gttome/Daily-AI-Brief-Compiler';
  const required = ['exec_command', 'write_stdin', 'mcp__codex_apps__github_fetch', 'mcp__codex_apps__github_fetch_file', 'mcp__codex_apps__github_create_blob', 'mcp__codex_apps__github_create_tree', 'mcp__codex_apps__github_create_commit', 'mcp__codex_apps__github_update_ref'];
  for (const name of required) if (typeof tools[name] !== 'function') throw new Error('existing_writer_capability_missing:' + name);
  if (typeof root !== 'string' || !root.startsWith('/') || typeof batchPath !== 'string' || !batchPath.startsWith(root + '/')) throw new Error('same_runtime_absolute_paths_required');
  const quote = value => "'" + String(value).replace(/'/g, "'\\''") + "'";
  const py = async (code, args = [], max_output_tokens = 18000) => {
    const r = await tools.exec_command({cmd: 'python -c ' + quote(code) + ' ' + args.map(quote).join(' '), max_output_tokens});
    if (r.exit_code !== 0 || r.session_id) throw new Error('local_bounded_read_failed');
    return JSON.parse(r.output);
  };
  function body(result) {
    if (result?.isError || result?.structuredContent?.isError) {
      const e = new Error(result?.structuredContent?.error || result?.content?.find(x => x.type === 'text')?.text || 'github_operation_failed');
      e.toolResult = result; throw e;
    }
    let s = result?.structuredContent ?? result;
    if (s?.structuredContent && !s.sha && !s.content && !s.encoding) s = s.structuredContent;
    if (typeof s?.content === 'string' && !s.encoding) {try {return JSON.parse(s.content);} catch {}}
    return s;
  }
  const fetchJson = async suffix => body(await tools.mcp__codex_apps__github_fetch({url: 'https://api.github.com/repos/' + repository + '/' + suffix}));
  const immutableBinaryRead = async (args, expectedBlob, expectedBytes) => {
    const parameters=[batchPath,args.commit,args.path,expectedBlob,...(expectedBytes===undefined?[]:[String(expectedBytes)])];
    let run=await tools.exec_command({cmd:'node '+quote(root+'/scripts/read-d1-immutable-file.mjs')+' '+parameters.map(quote).join(' '),workdir:root,yield_time_ms:1000,max_output_tokens:2000});
    let output=run.output||'';
    while(run.session_id&&run.exit_code===undefined){run=await tools.write_stdin({session_id:run.session_id,chars:'',yield_time_ms:1000,max_output_tokens:2000});output+=run.output||'';}
    let value;try{value=JSON.parse(output);}catch{throw new Error('immutable_binary_read_response');}
    if(run.exit_code!==0||value.error)throw new Error(value.error||'immutable_binary_read_failed');
    const ref=value.content_file;
    if(value.found!==true||ref?.repository!==repository||ref.commit!==args.commit||ref.repository_path!==args.path||ref.git_blob_sha!==expectedBlob)throw new Error('immutable_binary_read_binding');
    return value;
  };
  const source = await py('import pathlib,hashlib,json,sys\np=pathlib.Path(sys.argv[1]); b=p.read_bytes(); print(json.dumps({"path":str(p.resolve()),"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest(),"characters":len(b.decode("utf-8"))}))', [batchPath]);
  let serialized = '';
  // Keep large native PNG payloads inside code mode, never in model output.
  for (let offset = 0; offset < source.characters; offset += 24000) serialized += await py('import pathlib,json,sys\ns=pathlib.Path(sys.argv[1]).read_text(); a=int(sys.argv[2]); print(json.dumps(s[a:a+24000]))', [batchPath, String(offset)]);
  const batch = JSON.parse(serialized);
  if (batch.repository !== repository || batch.branch === 'main' || !Array.isArray(batch.writes)) throw new Error('batch_scope');
  const observations = [];
  let mutationAttempted = false;
  let createdCommit = null;
  const perform = async request => {
    const a = request.args;
    if (a.repository !== repository || (a.branch && (a.branch !== batch.branch || a.branch === 'main'))) throw new Error('connector_scope');
    if (request.op === 'getHead') {
      const d = await fetchJson('git/ref/heads/' + a.branch.split('/').map(encodeURIComponent).join('/'));
      return {sha: d.object?.sha};
    }
    if (request.op === 'readFile') {
      if (!/^[a-f0-9]{40}$/.test(a.commit || '')||typeof a.path!=='string'||a.path.length>1024||!a.path||/^[\/]|[\\\s:#?]/.test(a.path)||a.path.split('/').some(x=>!x||x==='.'||x==='..')) throw new Error('immutable_file_commit_and_path_required');
      try {
        const r = body(await tools.mcp__codex_apps__github_fetch_file({repository_full_name: repository, path: a.path, ref: a.commit, encoding: 'base64'}));
        if (r.encoding !== 'base64' || typeof r.content !== 'string'||!/^[a-f0-9]{40}$/.test(r.sha||'')) throw new Error('binary_encoding_or_blob_not_established');
        if(r.size!==undefined&&(!Number.isSafeInteger(r.size)||r.size<0||r.size>64*1024*1024))throw new Error('connector_file_size_bound');
        const content = r.content.replace(/\s/g, '');
        const bytes = content.length * 3 / 4 - (content.endsWith('==') ? 2 : content.endsWith('=') ? 1 : 0);
        // Empty base64 is a real empty file only when the immutable Git blob
        // is Git's empty-blob identity. Large binary omissions are not absence.
        if(content===''&&r.sha!=='e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')return await immutableBinaryRead(a,r.sha,r.size);
        if(r.size!==undefined&&r.size!==bytes)throw new Error('connector_file_size_mismatch');
        return {found: true, content_base64: content, bytes,git_blob_sha:r.sha};
      } catch (error) {
        const r = error.toolResult;
        const s = r?.structuredContent;
        const message = s?.error || r?.content?.find(x => x.type === 'text')?.text || '';
        if (r && (String(s?.error_data?.status) === '404' || s?.error_code === 'NOT_FOUND' || /^GitHub API error 404:/.test(message))) return {found: false, verified_absent: true};
        throw error;
      }
    }
    if (request.op === 'createCommit') {
      if (a.parent !== batch.expected_head || a.batch_file.path !== source.path || a.batch_file.bytes !== source.bytes || a.batch_file.sha256 !== source.sha256 || a.batch_file.batch_sha256 !== batch.batch_sha256 || a.writes.length !== batch.writes.length) throw new Error('batch_transport_binding');
      const current = await py('import pathlib,hashlib,json,sys\nb=pathlib.Path(sys.argv[1]).read_bytes(); print(json.dumps({"bytes":len(b),"sha256":hashlib.sha256(b).hexdigest()}))', [batchPath]);
      if (current.bytes !== source.bytes || current.sha256 !== source.sha256) throw new Error('batch_file_changed');
      const parent = await fetchJson('git/commits/' + a.parent);
      if (parent.sha !== a.parent || !/^[a-f0-9]{40}$/.test(parent.tree?.sha || '')) throw new Error('parent_tree_binding');
      const entries = [];
      for (const [index, metadata] of a.writes.entries()) {
        const write = batch.writes[metadata.batch_write_index];
        if (metadata.batch_write_index !== index || !write || !['path', 'bytes', 'bytes_sha256', 'git_blob_sha'].every(k => metadata[k] === write[k])) throw new Error('write_index_binding');
        mutationAttempted = true;
        const blob = body(await tools.mcp__codex_apps__github_create_blob({repository_full_name: repository, content: write.content_base64, encoding: 'base64'}));
        if (blob.sha !== write.git_blob_sha) throw new Error('created_blob_identity');
        entries.push({path: write.path, mode: '100644', type: 'blob', sha: blob.sha});
      }
      const tree = body(await tools.mcp__codex_apps__github_create_tree({repository_full_name: repository, base_tree_sha: parent.tree.sha, tree_elements: entries}));
      if (!/^[a-f0-9]{40}$/.test(tree.sha || '')) throw new Error('created_tree_identity');
      const commit = body(await tools.mcp__codex_apps__github_create_commit({repository_full_name: repository, parent_sha: a.parent, tree_sha: tree.sha, message: 'Record immutable D1 observed event ' + batch.event_sha256}));
      if (!/^[a-f0-9]{40}$/.test(commit.sha || '')) throw new Error('created_commit_identity');
      createdCommit = commit.sha;
      return {sha: commit.sha};
    }
    if (request.op === 'updateRef') {
      if (a.force !== false || a.expectedHead !== batch.expected_head || !createdCommit || a.commit !== createdCommit) throw new Error('expected_head_fence_required');
      mutationAttempted = true;
      body(await tools.mcp__codex_apps__github_update_ref({repository_full_name: repository, branch_name: a.branch, expected_sha: a.expectedHead, sha: a.commit, force: false}));
      return {updated: true, sha: a.commit, expected_sha: a.expectedHead};
    }
    throw new Error('unsupported_existing_writer_operation');
  };
  let run = await tools.exec_command({cmd: 'stty raw -echo\nexec node ' + quote(root + '/scripts/publish-d1-image-event.mjs') + ' ' + quote(batchPath), workdir: root, tty: true, yield_time_ms: 1000, max_output_tokens: 45000});
  const session = run.session_id;
  let pending = run.output || '', nextId = 1;
  for (;;) {
    const newline = pending.indexOf('\n');
    if (newline < 0) {
      if (!session || run.exit_code !== undefined) throw new Error('publisher_exited_without_complete_frame');
      run = await tools.write_stdin({session_id: session, chars: '', yield_time_ms: 1000, max_output_tokens: 45000});
      pending += run.output || ''; continue;
    }
    const line = pending.slice(0, newline); pending = pending.slice(newline + 1);
    if (!line.trim()) continue;
    const frame = JSON.parse(line);
    if (frame.protocol !== protocol) throw new Error('publisher_protocol');
    if (frame.kind === 'result') return {receipt: frame.receipt, observations, mutation_attempted: mutationAttempted, runtime_scope: 'CURRENT_CALLER_ONLY_NOT_FUTURE_WORK_PROOF'};
    if (frame.kind === 'error') return {error: frame, observations, mutation_attempted: mutationAttempted};
    if (frame.kind !== 'request' || frame.id !== nextId++) throw new Error('publisher_frame_order');
    let response;
    const startedAt = new Date().toISOString();
    try {
      const result = await perform(frame);
      response = {protocol, kind: 'response', id: frame.id, op: frame.op, ok: true, result};
      observations.push({id: frame.id, op: frame.op, started_at: startedAt, completed_at: new Date().toISOString(), result: 'OBSERVED', ...(result.sha ? {sha: result.sha} : {}), ...(typeof result.found === 'boolean' ? {found: result.found, bytes: result.bytes ?? null} : {})});
    } catch (error) {
      response = {protocol, kind: 'response', id: frame.id, op: frame.op, ok: false, error: {code: 'EXISTING_WRITER_OPERATION_FAILED', message: String(error.message).slice(0, 600)}};
      observations.push({id: frame.id, op: frame.op, started_at: startedAt, completed_at: new Date().toISOString(), result: 'FAILED', mutation_outcome: mutationAttempted ? 'UNKNOWN_RECONCILE_BEFORE_ANY_RETRY' : 'NO_MUTATION_ATTEMPTED'});
    }
    run = await tools.write_stdin({session_id: session, chars: JSON.stringify(response) + '\n', yield_time_ms: 1000, max_output_tokens: 45000});
    pending += run.output || '';
  }
}
