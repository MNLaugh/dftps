const res: Response | void = await fetch("https://api.github.com/repos/devartsite/dftps/commits").catch(console.error);
if (!res) throw new Error("coucou");
const commits = await res.json();

const newCommits = [];
const lastCommitID = "bf1060c";
for (const commit of commits) {
  if (commit.sha.search(lastCommitID) !== -1) {
    console.log("ici");
    break;
  } else newCommits.push(commit);
}

newCommits.forEach(({ sha, commit, html_url }) => {
  console.log(`${commit.message} ([${sha.substring(0, 7)}](${html_url}))`);
});
