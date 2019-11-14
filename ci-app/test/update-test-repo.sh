cd test/test-repo
git checkout master
rm package.json
echo "other file" > other.txt
echo "{\"name\":\"test-package\", \"version\":\"1.0.1\"}" > package.json

git add -- other.txt
git add -- package.json
git commit -m "test: update 1 (test)"

echo "<html>" > index.html
git add -- index.html
git commit -m "feat: update 2 (feat)"
git tag -a -m "first tag" 1.0.1
