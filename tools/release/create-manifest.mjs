import {execFileSync} from 'node:child_process';
import {writeFile,realpath} from 'node:fs/promises';
import {requiredChecks} from './evidence.mjs';

const [output,environment='staging',directory='.']=process.argv.slice(2);
if(!output||!['sandbox','staging','production'].includes(environment)){
 console.error('Usage: node tools/release/create-manifest.mjs <new-file.json> [sandbox|staging|production] [repo-root]');process.exit(2);
}
try{
 const root=await realpath(directory);
 const git=(args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 // A HEAD commit never attests uncommitted source. Prevent that common mistake.
 if(git(['status','--porcelain']))throw Error('Commit the reviewed source before creating exact-source evidence.');
 const commit=git(['rev-parse','HEAD']);
 if(!/^[a-f0-9]{40}$/.test(commit))throw Error('Exact source commit unavailable.');
 const manifest={schema_version:1,source_commit:commit,environment,created_at:new Date().toISOString(),
  checks:requiredChecks.map(id=>({id,status:'not_run',simulated:false})),
  blockers:[],deployment:null,owner_release_approval:null,cohort:{days:[],open_incidents:[]}};
 await writeFile(output,JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
 console.log('Created an unverified manifest. Every evidence gate remains NOT RUN.');
}catch(error){console.error(error instanceof Error?error.message:'Manifest creation failed.');process.exitCode=1;}
