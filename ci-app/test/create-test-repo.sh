mkdir test/test-repo
cd test/test-repo
echo "test file" > test.txt

git init
git add -- test.txt
git commit -m "feat: create 1 (feat)"

echo "{\"name\":\"test-package\", \"version\":\"1.0.0\"}" > package.json

git add -- package.json
git commit -m "fix: create 2 (fix)"
git tag -a -m "first tag" 1.0.0
git checkout -b stage
