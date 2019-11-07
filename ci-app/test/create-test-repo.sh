mkdir test/test-repo
cd test/test-repo
echo "test file" > test.txt

git init
git add -- test.txt
git commit -m "feat: adding test message"

echo "{\"name\":\"test-package\", \"version\":\"1.0.0\"}" > package.json

git add -- package.json
git commit -m "fix: adding package.json file"
git tag -a -m "first tag" 0.1.0
