cd test/test-repo
rm package.json
echo "other file" > other.txt
echo "{\"name\":\"test-package\", \"version\":\"1.0.1\"}" > package.json

git add -- other.txt
git add -- package.json

git commit -m "test: adding other file"
