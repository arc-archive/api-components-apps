import{PolymerElement,html,afterNextRender}from"./apic-ci-status.js";const cachedData={},pageTokens={};class TestComponentsDataFactory extends PolymerElement{static get template(){return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax
        id="request"
        loading="{{loading}}"
        url="[[apiBase]]tests/[[testId]]/components"
        handle-as="json"
        params="[[requestParams]]"
        on-response="_handleResponse"
        debounce-duration="300">
    `}connectedCallback(){super.connectedCallback();const id=this.testId;if(id&&cachedData[id]){this._restoreCahce(cachedData[id])}}static get properties(){return{apiBase:String,testId:{type:String,observer:"_testIdChanged"},list:{type:Array,notify:!0},hasMore:{type:Boolean,value:!0,notify:!0},loading:{type:Boolean,notify:!0},requestParams:Object}}_testIdChanged(id){if(!id){if(this.hasMore){this.hasMore=!1}}else{const cache=cachedData[id];if(cache){this._restoreCahce(cache)}else{if(!this.hasMore){this.hasMore=!0}this.list=void 0}}}_restoreCahce(cache){this.list=cache.data;this.hasMore=cache.hasMore}loadNext(){const id=this.testId;if(!id){throw new Error("Test id is not set when calling the API.")}const apiBase=this.apiBase;if(!apiBase){throw new Error("The apiBase property is not set.")}const token=pageTokens[id];if(token){this.requestParams={nextPageToken:token}}else if(this.requestParams){this.requestParams=void 0}this.$.request.generateRequest()}_handleResponse(e){const id=this.testId;if(!id){return}const data=e.target.lastResponse;if(!data){return}const token=data.nextPageToken;pageTokens[id]=token;if(!cachedData[id]){cachedData[id]={}}this.hasMore=cachedData[id].hasMore=!!token;if(!this.list){cachedData[id].data=data.items;this.list=data.items}else{cachedData[id].data=cachedData[id].data.concat(data.items);this.list=this.list.concat(data.items)}}clean(){this.list=void 0;this.hasMore=void 0;const id=this.testId;if(!id){return}cachedData[id]=void 0;pageTokens[id]=void 0}}window.customElements.define("test-components-data-factory",TestComponentsDataFactory);const cachedData$1={},pageTokens$1={};class TestLogsDataFactory extends PolymerElement{static get template(){return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax
        id="request"
        loading="{{loading}}"
        url="[[apiBase]]tests/[[testId]]/components/[[componentName]]/logs"
        handle-as="json"
        params="[[requestParams]]"
        on-response="_handleResponse"
        debounce-duration="300">
    `}static get properties(){return{apiBase:String,testId:String,componentName:String,list:{type:Array,notify:!0},hasMore:{type:Boolean,notify:!0},loading:{type:Boolean,notify:!0},requestParams:Object}}static get observers(){return["_paramsChanged(testId, componentName)"]}connectedCallback(){super.connectedCallback();const id=this.testId,name=this.componentName;if(id&&name&&cachedData$1[id]&&cachedData$1[id][name]){this._restoreCahce(cachedData$1[id][name])}}_paramsChanged(id,name){if(!id||!name){if(this.hasMore){this.hasMore=!1}return}const cache=cachedData$1[id]&&cachedData$1[id][name];if(cache){this._restoreCahce(cache)}else{if(!this.hasMore){this.hasMore=!0}this.list=void 0}}_restoreCahce(cache){this.list=cache.data;this.hasMore=cache.hasMore}loadNext(){const id=this.testId;if(!id){throw new Error("Test id is not set when calling the API.")}const name=this.componentName;if(!name){throw new Error("Component name is not set when calling the API.")}const apiBase=this.apiBase;if(!apiBase){throw new Error("The apiBase property is not set.")}const token=pageTokens$1[id]&&pageTokens$1[id][name];if(token){this.requestParams={nextPageToken:token}}else if(this.requestParams){this.requestParams=void 0}this.$.request.generateRequest()}_handleResponse(e){const id=this.testId;if(!id){return}const name=this.componentName;if(!name){return}const data=e.target.lastResponse,token=data.nextPageToken;if(!pageTokens$1[id]){pageTokens$1[id]={}}pageTokens$1[id][name]=token;if(!cachedData$1[id]){cachedData$1[id]={}}if(!cachedData$1[id][name]){cachedData$1[id][name]={}}this.hasMore=cachedData$1[id][name].hasMore=!!token;if(!this.list){cachedData$1[id][name].data=data.items;this.list=data.items}else{cachedData$1[id][name].data=cachedData$1[id][name].data.concat(data.items);this.list=this.list.concat(data.items)}}clean(){this.list=void 0;this.hasMore=void 0;const id=this.testId;if(!id){return}const name=this.componentName;if(!name){return}if(cachedData$1[id]){delete cachedData$1[id][name]}if(pageTokens$1[id]){delete pageTokens$1[id][name]}}}window.customElements.define("test-logs-data-factory",TestLogsDataFactory);class LogRenderer extends PolymerElement{static get template(){return html`
      <style>
      :host {
        display: block;
      }

      ol {
        margin: 0;
        padding: 0;
      }

      li[is-file] {
        @apply --paper-font-title;
      }

      li {
        @apply --paper-font-subhead;
        list-style: none;
      }

      li[is-test] {
        @apply --paper-font-body2;
      }

      li[state]::before {
        font-size: 15px;
        display: inline-block;
        margin-right: 4px;
      }

      li[state="passing"]::before {
        content: '✓';
        color: #2E7D32;
      }

      li[state="failed"]::before {
        content: '✖';
        color: #F44336;
      }

      a {
        color: currentColor;
      }

      .new-win-icon {
        margin-left: 8px;
        width: 20px;
        height: 20px;
        color: #757575;
      }
      </style>
      <ol>
      <template is="dom-repeat" items="[[_logs]]">
        <li classs="log" is-file$="[[item.isFile]]" state$="[[item.state]]" is-test$="[[item.isTest]]" style$="[[_computeIndentStyle(item.indent)]]">
          <template is="dom-if" if="[[item.isFile]]">
            <a href="https://github.com/advanced-rest-client/[[componentName]]/blob/stage/[[item.name]]" target="_blank" title="Open test file">[[item.name]] <iron-icon class="new-win-icon" icon="apic:open-in-new"></iron-icon></a>
          </template>
          <template is="dom-if" if="[[!item.isFile]]">[[item.name]]</template>
        </li>
      </template>
      </ol>
    `}static get properties(){return{logs:{type:Array,observer:"_logsChanged"},componentName:String,_logs:Array}}_logsChanged(logs){if(!logs||!logs.length){this._logs=void 0;return}const data=[];for(let i=0,len=logs.length;i<len;i++){const log=logs[i];let idPath="";for(let j=0,jLen=log.path.length;j<jLen;j++){const isLast=j+1===jLen;if(isLast){const obj={name:log.path[j],isTest:!0,indent:j,state:log.state,isFile:!1};data[data.length]=obj;continue}let dataHasPath=!1;idPath+=log.path[j];for(let k=0,kLen=data.length;k<kLen;k++){if(data[k].id===idPath){dataHasPath=!0;break}}if(dataHasPath){continue}const obj={id:idPath,name:log.path[j],isTest:!1,indent:j};if(0===j){obj.isFile=!0}else{obj.isFile=!1}data[data.length]=obj}}this._logs=data}_computeIndentStyle(indent){if(!indent){return""}const value=8*indent;return`padding-left: ${value}px`}}window.customElements.define("logs-renderer",LogRenderer);class ComponentLogsViewer extends PolymerElement{static get template(){return html`
      <style>
      :host {
        display: block;
      }

      h2 {
        @apply --paper-font-headline;
      }

      paper-progress {
        width: 100%;
        --paper-progress-active-color: #00698c;
      }

      .cmp-message {
        margin: 1em 8px;
        font-size: 16px;
        color: #F44336;
      }
      </style>
      <test-logs-data-factory id="request" test-id="[[testId]]" component-name="[[componentName]]" api-base="[[apiBase]]" list="{{browsers}}" has-more="{{hasMore}}" loading="{{loading}}"></test-logs-data-factory>
      <template is="dom-if" if="[[loading]]">
        <paper-progress indeterminate></paper-progress>
      </template>
      <template is="dom-repeat" items="[[browsers]]">
        <h2>[[item.browser]] [[item.version]]</h2>
        <template is="dom-if" if="[[item.message]]">
          <p class="cmp-message">[[item.message]]</p>
        </template>
        <template is="dom-if" if="[[_hasLogs(item.logs)]]">
          <logs-renderer logs="[[item.logs]]" component-name="[[componentName]]"></logs-renderer>
        </template>
      </template>
    `}static get properties(){return{apiBase:String,testId:String,componentName:Boolean,loading:{type:Boolean},browsers:Array,hasMore:Boolean}}static get observers(){return["_requestDataObserver(hasMore, testId, componentName)"]}_requestDataObserver(hasMore,testId,componentName){if(!1===hasMore||!testId||!componentName||this.loading){return}afterNextRender(this,()=>{if(!this.browsers&&!this.loading){this.$.request.loadNext()}})}_hasLogs(logs){return!!(logs&&logs.length)}}window.customElements.define("component-logs-viewer",ComponentLogsViewer);class TestComponentListItem extends PolymerElement{static get template(){return html`
      <style>
      :host {
        display: block;
        @apply --paper-font-body1;
      }

      .item-container {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      .item:first-child {
        margin-left: 0;
      }

      .item:last-of-type {
        margin-right: 0;
      }

      .item {
        @apply --layout-vertical;
        padding: 4px 8px;
        margin: 4px 24px;
      }

      .item.max {
        @apply --layout-flex;
      }

      .item.numbers {
        width: 70px;
      }

      .item label {
        display: block;
        color: #757575;
        @apply --paper-font-caption;
      }

      .item > div {
        display: block;
      }

      .ratio-counter,
      .failed-counter,
      .passed-counter {
        font-size: 18px;
      }

      .passed-counter {
        color: #2E7D32;
      }

      :host([failed]) .failed-counter {
        color: #F44336;
      }

      .component {
        @apply --paper-font-common-nowrap;
      }

      .cmp-message {
        margin: 1em 8px;
        font-size: 16px;
        color: #F44336;
      }

      .toggle-button {
        outline: none;
        color: rgba(0, 0, 0, 0.74);
        transition: color 0.25s ease-in-out, transform 0.24s ease-in-out;
        transform: rotateZ(0deg);
      }

      .toggle-button:hover {
        color: rgba(0, 0, 0, 0.88);
      }

      .toggle-button[opened] {
        transform: rotateZ(-180deg);
      }

      .viewer {
        margin: 0 8px;
      }
      </style>
      <div class="item-container">
        <div class="item max">
          <label>Component:</label>
          <span class="component">[[item.component]]</span>
        </div>

        <div class="item numbers">
          <label>Passed:</label>
          <span class="passed-counter">[[_computePassed(item.*)]]</span>
        </div>

        <div class="item numbers">
          <label>Failed:</label>
          <span class="failed-counter">[[_computeFailed(item.*)]]</span>
        </div>

        <div class="item numbers">
          <label>Ratio:</label>
          <span class="ratio-counter">[[_computePassRatio(item.*)]]%</span>
        </div>

        <paper-icon-button icon="apic:details" on-click="toggleDetails" title="Toggle execution logs" class="toggle-button" opened$="[[detailsOpened]]"></paper-icon-button>
      </div>
      <template is="dom-if" if="[[detailsOpened]]" restamp>
        <template is="dom-if" if="[[item.message]]">
          <p class="cmp-message">[[item.message]]</p>
        </template>
        <template is="dom-if" if="[[item.hasLogs]]">
          <component-logs-viewer test-id="[[testId]]" component-name="[[item.component]]" api-base="[[apiBase]]" class="viewer"></component-logs-viewer>
        </template>
      </template>
    `}static get properties(){return{item:String,failed:{type:Boolean,value:!1,reflectToAttribute:!0,computed:"_computeIsFailed(item)"},detailsOpened:Boolean,testId:String}}_computeIsFailed(item){if(!item){return!1}return"failed"===item.status}_computePassed(record){const item=record&&record.base,passed=item&&item.passed;return passed||"0"}_computeFailed(record){const item=record&&record.base,failed=item&&item.failed;return failed||"0"}_computePassRatio(record){const item=record&&record.base,passed=item&&item.passed||0,failed=item&&item.failed||0,size=passed+failed;if(!passed||!size){return 0}return Math.round(100*(passed/size))}toggleDetails(){this.detailsOpened=!this.detailsOpened}}window.customElements.define("test-component-list-item",TestComponentListItem);class ArcTestDetails extends PolymerElement{static get template(){return html`
      <style>
      :host {
        display: block;
        max-width: 1200px;
        margin: 24px auto;
      }

      header {
        @apply --layout-horizontal;
        @apply --layout-center;
      }

      h1 {
        @apply --paper-font-headline;
        @apply --layout-flex;
      }

      .li {
        border: 1px #E0E0E0 solid;
        border-radius: 3px;
        margin: 8px 0;
      }

      .desc > span.passed-count,
      .desc > span.result-value[passing] {
        color: #2E7D32;
      }

      .desc > span.failed-count,
      .desc > span.result-value {
        color: #F44336;
      }

      .result-value {
        margin-right: 8px;
      }

      .desc {
        color: #616161;
        font-size: 18px;
        line-height: 24px;
        letter-spacing: 0.011em;
      }

      .desc > span {
        color: #212121;
      }

      .queue-empty-state {
        @apply --layout-horizontal;
        @apply --layout-center;
        margin: 40px auto;
        max-width: 800px;
      }

      .circle {
        border-radius: 50%;
        border: solid 12px #E0E0E0;
        width: 80px;
        height: 80px;
        color: #9E9E9E;
        font-size: 16px;
        @apply --layout-vertical;
        @apply --layout-center-center;
      }

      .circle.ready {
        border-color: #2196f3;
        color: #212121;
      }

      .graph-line {
        flex: 1;
        height: 4px;
        border: 4px #E0E0E0 solid;
        margin: 0 24px;
      }

      a {
        color: currentColor;
      }

      .delete-test {
        background-color: var(--accent-color);
        color: var(--accent-text-color);
      }

      .test-actions {
        margin: 24px 0;
      }

      .error-toast {
        background-color: #FF5722;
        color: #fff;
      }

      .reset-test-container {
        margin: 12px 0;
      }

      .restart-button {
        background-color: var(--accent-color);
        color: var(--accent-text-color);
      }
      </style>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Test details</h1>
        <template is="dom-if" if="[[isQueued]]">
          <template is="dom-if" if="[[canCreate]]">
            <paper-icon-button icon="apic:delete" title="Delete this test" on-click="removeTest"></paper-icon-button>
          </template>
        </template>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
      </header>

      <div class="details">
        <div class="desc status">
          Status: <span class="status-value">[[testDetail.status]]</span>
        </div>
        <template is="dom-if" if="[[testFinished]]">
          <div class="desc result">
            Result: <span class="result-value" passing$=[[testPassed]]>[[_computeTestResult(testPassed)]]</span> (<span class="passed-count">[[testDetail.passed]]</span>/<span class="failed-count">[[testDetail.failed]]</span>)
          </div>
        </template>
        <template is="dom-if" if="[[isAmfTest]]">
          <div class="desc type">
            AMF: <span class="branch-value">[[testDetail.branch]]</span>
          </div>
        </template>
        <template is="dom-if" if="[[!isAmfTest]]">
          <div class="desc type">
            [[testDetail.component]]: <span class="branch-value">[[testDetail.branch]]</span>
          </div>
        </template>
      <div>

      <template is="dom-if" if="[[canCreate]]">
        <div class="reset-test-container">
          <paper-button on-click="restartTest" class="restart-button" raised>Restart test</paper-button>
        </div>
      </template>

      <template is="dom-repeat" items="[[componentsList]]">
        <test-component-list-item class="li" item="[[item]]" test-id="[[testId]]" api-base="[[apiBase]]"></test-component-list-item>
      </template>

      <template is="dom-if" if="[[isQueued]]">
        <div class="queue-empty-state">
          <div class="circle ready">Queued</div>
          <div class="graph-line"></div>
          <div class="circle">Executed</div>
          <div class="graph-line"></div>
          <div class="circle">Results</div>
        </div>
      </template>

      <template is="dom-if" if="[[startedRunning]]">
        <div class="queue-empty-state">
          <div class="circle ready">Queued</div>
          <div class="graph-line"></div>
          <div class="circle ready">Executing</div>
          <div class="graph-line"></div>
          <div class="circle">Results</div>
        </div>
      </template>

      <tests-data-factory id="testFactory" api-base="[[apiBase]]" list="{{testsList}}" has-more="{{hasMore}}"></tests-data-factory>
      <test-components-data-factory
        id="request"
        api-base="[[apiBase]]"
        test-id="[[testId]]"
        list="{{componentsList}}"
        loading="{{loading}}"></test-components-data-factory>
      <paper-toast class="error-toast" id="err" duration="7000"></paper-toast>
    `}static get properties(){return{apiBase:String,testId:String,opened:Boolean,testsList:Array,componentsList:Array,loading:{type:Boolean,notify:!0},apiToken:String,testDetail:{type:Object,computed:"_computeTestDetail(testsList, testId, opened)",notify:!0},testPassed:{type:Boolean,computed:"_computeTestPassed(testFinished, testDetail)"},testFinished:{type:Boolean,computed:"_computeTestFinished(testDetail.status)"},isAmfTest:{type:Boolean,computed:"_computeIsAmf(testDetail.type)"},hasMore:Boolean,isQueued:{type:Boolean,computed:"_computeTestQueued(testDetail.status)"},isRunning:{type:Boolean,computed:"_computeTestRunning(testDetail.status)"},canCreate:Boolean,startedRunning:{type:Boolean,computed:"_computeStartedRunning(isRunning, componentsList)"}}}static get observers(){return["_requestDataObserver(opened, hasMore, testId)"]}_computeTestDetail(testsList,testId,opened){if(!opened||!testsList||!testsList.length||!testId){return}return testsList.find(item=>item.id===testId)}_requestDataObserver(opened,hasMore,testId){if(!opened||!1===hasMore||!testId||this.loading){return}afterNextRender(this,()=>{if(!this.componentsList&&!this.loading){this.$.request.loadNext()}})}_computeTestPassed(testFinished,test){if(!testFinished||!test){return!0}return 0===test.failed&&0<test.passed}_computeTestResult(testPassed){return testPassed?"Passed":"Failed"}_computeIsAmf(type){return"amf-build"===type}_computeTestFinished(status){return"finished"===status}_computeTestQueued(status){return"queued"===status}_computeTestRunning(status){return"running"===status}_computeStartedRunning(isRunning,testsList){return!!(isRunning&&(!testsList||!testsList.length))}refresh(){this.$.request.clean();this.$.request.loadNext();this.$.testFactory.refreshTest(this.testId)}_renderError(message){this.$.err.text=message;this.$.err.opened=!0}removeTest(){const url=this.apiBase+"tests/"+this.testId,init={method:"DELETE"};if(this.apiToken){init.headers=[["authorization","bearer "+this.apiToken]]}return fetch(url,init).then(response=>{if(!response.ok){this._renderError("Unable to remove test.")}else{this.$.testFactory.clean();this.dispatchEvent(new CustomEvent("navigate",{composed:!0,bubbles:!0,detail:{path:"/status"}}))}}).catch(cause=>{this._renderError("Unable to remove test.");console.error(cause)})}restartTest(){const url=this.apiBase+"tests/"+this.testId+"/restart",init={method:"PUT"};if(this.apiToken){init.headers=[["authorization","bearer "+this.apiToken]]}return fetch(url,init).then(response=>{if(204===response.status){this.refresh()}else{return response.json()}}).then(error=>{if(error){this._renderError(error.message||"Request to the API failed.")}}).catch(cause=>{this._renderError(cause.message||"Unable to connect to the API.")})}}window.customElements.define("arc-test-details",ArcTestDetails);