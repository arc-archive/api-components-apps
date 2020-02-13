1.  Bump version in `package.json` and `package-lock.json` files.
2.  Update image version to match package version in:
    -   ../gke/deployment-api.yaml
    -   ../gke/deployment-github.yaml
    -   ../gke/deployment-worker.yaml
3.  Run
    ```sh
    npm run gke:build
    ```
4.  For this step you need write permission to kuberneties registry in GCE. Run
    ```sh
    npm run gke:deploy
    ```
5.  Make sure you have right configuration loaded for kubectl
    ```sh
    kubectl config current-context
    # should be gke_advancedrestclient-1155_us-west1-a_apic-ci
    # if not then:
    kubectl config use-context gke_advancedrestclient-1155_us-west1-a_apic-ci
    ```
6.  Deploy configuration
    ```sh
    npm run gke:deploy-config
    ```
