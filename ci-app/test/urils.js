const { exec } = require('child_process');
const path = require('path');

const createRepository = () => {
  return new Promise((resolve, reject) => {
    const file = path.join(__dirname, 'create-test-repo.sh');
    exec(file, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

module.exports.createRepository = createRepository;
