import{PolymerElement,html}from"./apic-ci-status.js";let cachedData=[],pageToken;class TestsModel extends PolymerElement{static get template(){return html`
      <style>
      :host {display: none !important;}
      </style>
      <iron-ajax
        id="request"
        loading="{{loading}}"
        url="[[apiBase]]tests"
        handle-as="json"
        params="[[requestParams]]"
        on-response="_handleResponse"
        debounce-duration="300">
    `}static get properties(){return{apiBase:String,list:{type:Array,notify:!0},hasMore:{type:Boolean,value:!0,notify:!0},loading:{type:Boolean,notify:!0},requestParams:Object}}constructor(){super();this._testDeletedHandler=this._testDeletedHandler.bind(this);this._testUpdatedHandler=this._testUpdatedHandler.bind(this);this._testAddedHandler=this._testAddedHandler.bind(this)}connectedCallback(){super.connectedCallback();window.addEventListener("test-deleted",this._testDeletedHandler);window.addEventListener("test-updated",this._testUpdatedHandler);window.addEventListener("test-added",this._testAddedHandler);if(cachedData&&cachedData.length){this.list=Array.from(cachedData)}if(!(this.list&&this.list.length)){this.loadNext()}}disconnectedCallback(){super.disconnectedCallback();window.removeEventListener("test-deleted",this._testDeletedHandler);window.removeEventListener("test-updated",this._testUpdatedHandler);window.removeEventListener("test-added",this._testAddedHandler)}clean(){pageToken=void 0;cachedData=[];this.list=void 0;this.hasMore=void 0}loadNext(){if(pageToken){this.requestParams={nextPageToken:pageToken}}else if(this.requestParams){this.requestParams=void 0}this.$.request.generateRequest()}_handleResponse(e){const data=e.target.lastResponse;pageToken=data.nextPageToken;if(pageToken&&!this.hasMore){this.hasMore=!0}else if(!pageToken&&this.hasMore){this.hasMore=!1}if(!this.list){cachedData=data.items;this.list=Array.from(data.items)}else{cachedData=cachedData.concat(data.items);this.list=this.list.concat(data.items)}}refreshTest(id){if(!id){return}const url=this.apiBase+"tests/"+id;return fetch(url).then(response=>{if(!response.ok){throw new Error("Unable to refresh test data.")}return response.json()}).then(resource=>{if(!this.list){this.list=[resource];cachedData=[resource]}else{let updated=!1;for(let i=0,len=cachedData.length;i<len;i++){if(cachedData[i].id===id){cachedData[i]=resource;this.set(`list.${i}`,resource);updated=!0;break}}if(!updated){cachedData.push(resource);this.push("list",resource)}}})}_testDeletedHandler(e){const{id}=e.detail,list=this.list||[];for(let i=0,len=list.length;i<len;i++){if(list[i].id===id){this.splice("list",i,1);cachedData.splice(i,1);break}}}_testUpdatedHandler(e){const{id}=e.detail;this.refreshTest(id)}_testAddedHandler(){this.clean();this.loadNext()}}window.customElements.define("tests-model",TestsModel);class TestListItem extends PolymerElement{static get template(){return html`
      <style>
      :host {
        display: block;
        @apply --paper-font-body1;
      }

      .item-container,
      .data-container {
        @apply --layout-horizontal;
      }

      .data-container {
        @apply --layout-flex;
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
        width: 30%;
      }

      .item.max {
        @apply --layout-flex;
      }

      .item label {
        display: block;
        color: #757575;
        @apply --paper-font-caption;
      }

      .item > div {
        display: block;
      }

      .result-status {
        color: #2E7D32;
      }

      :host([failed]) .result-status {
        color: #F44336;
      }

      .test-status {
        text-transform: capitalize;
      }

      .source-commit {
        color: #9E9E9E;
        font-size: 12px;
        max-width: 120px;
        @apply --paper-font-common-nowrap;
      }

      .component {
        width: 120px;
        @apply --paper-font-common-nowrap;
      }

      a {
        color: currentColor;
      }

      .time-item {
        width: 120px;
        @apply --paper-font-common-nowrap;
      }

      @media (max-width: 760px) {
        .item {
          @apply --layout-vertical;
          margin: 4px 0;
          width: 100%;
        }

        .item.detail-result {
          display: none !important;
        }

        .item.narrow {
          @apply --layout-vertical;
        }

        .data-container {
          @apply --layout-vertical;
          @apply --layout-start;
          width: 100%;
        }
      }
      </style>
      <div class="item-container">
        <div class="data-container">
          <div class="item time-item">
            <label>[[_computeTimeLabel(item)]]:</label>
            <relative-time datetime$="[[_computeTimeValue(item)]]"></relative-time>
          </div>

          <div class="item">
            <label>Status:</label>
            <span class="test-status">[[item.status]]</span>
          </div>

          <div class="item">
            <label>Result:</label>
            <span class="result-status">[[resultLabel]]</span>
          </div>

          <div class="item max">
            <label>Branch:</label>
            <span class="source-branch">[[item.branch]]</span>
            <template is="dom-if" if="[[item.commit]]">
              <span class="source-commit" title="Commit SHA">[[item.commit]]</span>
            </template>
          </div>
          <template is="dom-if" if="[[item.component]]">
            <div class="item max">
              <label>Component:</label>
              <span class="component">[[item.component]]</span>
            </div>
          </template>
        </div>

        <a href="#/test-details/[[item.id]]">
          <paper-button>Details</paper-button>
        </a>
      </div>
    `}static get properties(){return{item:Object,isAmfBuild:{type:Boolean,computed:"_computeIsAmfBuid(item.type)"},isFinished:{type:Boolean,value:!1,computed:"_computeIsFinished(item.status)"},failed:{type:Boolean,value:!1,reflectToAttribute:!0,computed:"_computeIsFailed(item)"},queued:{type:Boolean,reflectToAttribute:!0,computed:"_computeIsQueued(item.status)"},running:{type:Boolean,reflectToAttribute:!0,computed:"_computeRunning(item.status)"},resultLabel:{type:String,computed:"_computeResultLabel(isFinished, failed)"}}}_computeTimeLabel(item){if(!item){return""}switch(item.status){case"queued":return"Scheduled";case"running":return"Started";case"finished":return"Ended";default:return"";}}_computeTimeValue(item){if(!item){return}let time;switch(item.status){case"queued":time=item.created;break;case"running":time=item.startTime;break;case"finished":time=item.endTime;break;}if(!time||isNaN(time)){return}const d=new Date(+time);return d.toISOString()}_computeResultLabel(finished,failed){if(!finished){return"n/a"}return failed?"Failed":"Success"}_computeRunning(){return"running"===status}_computeIsAmfBuid(type){return"amf-build"===type}_computeIsFinished(status){return"finished"===status}_computeIsQueued(status){return"queued"===status}_computeIsFailed(item){if(!item){return!1}if("finished"!==item.status){return!1}if(item.failed&&0<item.failed){return!0}return!1}_computePassed(record){const item=record&&record.base,passed=item&&item.passed;return passed||"0"}_computeFailed(record){const item=record&&record.base,failed=item&&item.failed;return failed||"0"}_computeSize(record){const item=record&&record.base,size=item&&item.size||0;return size}_computePassRatio(record){const item=record&&record.base,passed=item&&item.passed||0,size=item&&item.size||0;if(!passed||!size){return 0}return Math.round(100*(passed/size))}}window.customElements.define("test-list-item",TestListItem);class ArcStatus extends PolymerElement{static get template(){return html`
      <style>
      :host {
        display: block;
        position: relative;
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
        border-left: 2px #2E7D32 solid;
      }

      .li[failed] {
        border-left: 2px #F44336 solid;
      }

      .li[queued] {
        border-left: 2px #9E9E9E solid;
      }

      .no-data-container {
        margin: 30% auto;
        width: 50%;
      }

      .visual {
        @apply --layout-horizontal;
        background-color: #757575;
        opacity: 0.7;
      }

      .item {
        @apply --layout-flex;
        height: 40px;
        background-color: #B0BEC5;
        margin: 6px;
      }

      .item.accent {
        background-color: #4CAF50;
      }

      .empty-info {
        text-align: center;
        color: #616161;
        font-size: 22px;
      }

      .empty-info2 {
        text-align: center;
        color: #9E9E9E;
        font-size: 22px;
      }

      @media (max-width: 1248px) {
        :host {
          margin: 0 24px 24px 24px;
          width: 100%:
        };
      }

      @media (max-width: 420px) {
        :host {
          margin: 0 12px 12px 12px;
          width: 100%:
        };
      }
      </style>
      <header>
        <h1>API components tests</h1>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
      </header>
      <template is="dom-repeat" items="[[testsList]]">
        <test-list-item class="li" item="[[item]]"></test-list-item>
      </template>
      <template is="dom-if" if="[[hasMore]]">
        <div class="more-container">
          <paper-button on-click="loadNext" class="more-button" raised>Load more</paper-button>
        </div>
      </template>

      <template is="dom-if" if="[[renderEmptyInfo]]">
        <div class="no-data-container">
          <div class="visual">
            <div class="item"></div>
            <div class="item accent"></div>
            <div class="item"></div>
            <div class="item"></div>
          </div>
          <p class="empty-info">There are no tests to see.</p>
          <p class="empty-info2">All tests results appear here when scheduled.</p>
        </div>
      </template>

      <tests-model id="model" api-base="[[apiBase]]" list="{{testsList}}" has-more="{{hasMore}}" loading="{{loading}}"></tests-model>
    `}static get properties(){return{testsList:{type:Array},apiBase:String,hasMore:{type:Boolean,value:!0},loading:{type:Boolean,notify:!0},hasResults:{type:Boolean,computed:"_computeHasResults(testsList.*)"},renderEmptyInfo:{type:Boolean,computed:"_computeRenderEmptyInfo(hasResults, loading)"}}}refresh(){this.$.model.clean();this.$.model.loadNext()}_computeHasResults(record){const value=record&&record.base;return!!(value&&value.length)}_computeRenderEmptyInfo(hasResults,loading){return!hasResults&&!loading}}window.customElements.define("arc-status",ArcStatus);