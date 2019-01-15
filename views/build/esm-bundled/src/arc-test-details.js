import{PolymerElement,html,afterNextRender}from"./apic-ci-status.js";const $_documentContainer=document.createElement("template");$_documentContainer.innerHTML=`<iron-iconset-svg name="apic" size="24">
  <svg>
    <defs>
    <g id="arrow-back"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></g>
    <g id="details"><path d="M3 4l9 16 9-16H3zm3.38 2h11.25L12 16 6.38 6z"></path></g>
    <g id="refresh"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></g>
    </defs>
  </svg>
</iron-iconset-svg>`;document.head.appendChild($_documentContainer.content);const cachedData={},pageTokens={};class TestComponentsDataFactory extends PolymerElement{static get template(){return html`
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
    `}connectedCallback(){super.connectedCallback();const id=this.testId;if(id&&cachedData[id]){this._restoreCahce(cachedData[id])}}static get properties(){return{apiBase:String,testId:{type:String,observer:"_testIdChanged"},list:{type:Array,notify:!0},hasMore:{type:Boolean,value:!0,notify:!0},loading:{type:Boolean,notify:!0},requestParams:Object}}_testIdChanged(id){if(!id){if(this.hasMore){this.hasMore=!1}}else{const cache=cachedData[id];if(cache){this._restoreCahce(cache)}else{if(!this.hasMore){this.hasMore=!0}this.list=void 0}}}_restoreCahce(cache){this.list=cache.data;this.hasMore=cache.hasMore}loadNext(){const id=this.testId;if(!id){throw new Error("Test id is not set when calling the API.")}const apiBase=this.apiBase;if(!apiBase){throw new Error("The apiBase property is not set.")}const token=pageTokens[id];if(token){this.requestParams={nextPageToken:token}}else if(this.requestParams){this.requestParams=void 0}this.$.request.generateRequest()}_handleResponse(e){const id=this.testId;if(!id){return}const data=e.target.lastResponse,token=data.nextPageToken;pageTokens[id]=token;if(!cachedData[id]){cachedData[id]={}}this.hasMore=cachedData[id].hasMore=!!token;if(!this.list){cachedData[id].data=data.items;this.list=data.items}else{cachedData[id].data=cachedData[id].data.concat(data.items);this.list=this.list.concat(data.items)}}clean(){this.list=void 0;this.hasMore=void 0;const id=this.testId;if(!id){return}cachedData[id]=void 0;pageTokens[id]=void 0}}window.customElements.define("test-components-data-factory",TestComponentsDataFactory);class TestComponentListItem extends PolymerElement{static get template(){return html`
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
          <p class="cmp-message">LOGS!!!</p>
        </template>
      </template>
    `}static get properties(){return{item:String,failed:{type:Boolean,value:!1,reflectToAttribute:!0,computed:"_computeIsFailed(item)"},detailsOpened:Boolean}}_computeIsFailed(item){if(!item){return!1}return"failed"===item.status}_computePassed(record){const item=record&&record.base,passed=item&&item.passed;return passed||"0"}_computeFailed(record){const item=record&&record.base,failed=item&&item.failed;return failed||"0"}_computePassRatio(record){const item=record&&record.base,passed=item&&item.passed||0,failed=item&&item.failed||0,size=passed+failed;if(!passed||!size){return 0}return Math.round(100*(passed/size))}toggleDetails(){this.detailsOpened=!this.detailsOpened}}window.customElements.define("test-component-list-item",TestComponentListItem);class ArcTestDetails extends PolymerElement{static get template(){return html`
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

      .passed-count,
      .result-value[passing] {
        color: #2E7D32;
      }

      .failed-count,
      .result-value {
        color: #F44336;
      }

      .result-value {
        margin-right: 8px;
      }

      .desc {
        color: #616161;
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
        height: 16px;
        border: 4px #E0E0E0 solid;
        margin: 0 24px;
      }

      a {
        color: currentColor;
      }
      </style>
      <header>
        <a href="#/">
          <paper-icon-button icon="apic:arrow-back" title="Return to tests list"></paper-icon-button>
        </a>
        <h1>Test details</h1>
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
      <template is="dom-repeat" items="[[componentsList]]">
        <test-component-list-item class="li" item="[[item]]"></test-component-list-item>
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

      <tests-data-factory id="testFactory" api-base="[[apiBase]]" list="{{testsList}}"></tests-data-factory>
      <test-components-data-factory
        id="request"
        api-base="[[apiBase]]"
        test-id="[[testId]]"
        list="{{componentsList}}"
        loading="{{loading}}"></test-components-data-factory>
    `}static get properties(){return{apiBase:String,testId:String,opened:Boolean,testsList:Array,componentsList:Array,loading:{type:Boolean,notify:!0},testDetail:{type:Object,computed:"_computeTestDetail(testsList, testId, opened)",notify:!0},testPassed:{type:Boolean,computed:"_computeTestPassed(testFinished, testDetail)"},testFinished:{type:Boolean,computed:"_computeTestFinished(testDetail.status)"},isAmfTest:{type:Boolean,computed:"_computeIsAmf(testDetail.type)"},hasMore:Boolean,isQueued:{type:Boolean,computed:"_computeTestQueued(testDetail.status)"}}}static get observers(){return["_requestDataObserver(opened, hasMoreComponents, testId)"]}_computeTestDetail(testsList,testId,opened){if(!opened||!testsList||!testsList.length||!testId){return}return testsList.find(item=>item.id===testId)}_requestDataObserver(opened,hasMoreComponents,testId){if(!opened||!1===hasMoreComponents||!testId){return}afterNextRender(this,()=>{if(!this.componentsList){this.$.request.loadNext()}})}_computeTestPassed(testFinished,test){if(!testFinished||!test){return!0}return 0===test.failed&&0<test.passed}_computeTestResult(testPassed){return testPassed?"Passed":"Failed"}_computeIsAmf(type){return"amf-build"===type}_computeTestFinished(status){return"finished"===status}_computeTestQueued(status){return"queued"===status}refresh(){this.$.request.clean();this.$.request.loadNext();this.$.testFactory.refreshTest(this.testId)}}window.customElements.define("arc-test-details",ArcTestDetails);