import{PolymerElement,html}from"./apic-ci-status.js";class TestListItem extends PolymerElement{static get template(){return html`
      <style>
      :host {
        display: block;
        @apply --paper-font-body1;
      }

      .item-container {
        @apply --layout-horizontal;
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

      .item label {
        display: block;
        color: #757575;
        @apply --paper-font-caption;
      }

      .item > div {
        display: block;
      }

      .item.numbers {
        width: 70px;
      }

      .ration-counter,
      .failed-counter,
      .size-counter,
      .passed-counter {
        font-size: 18px;
      }

      .passed-counter {
        color: #2E7D32;
      }

      :host([queued]) .passed-counter,
      :host([queued]) .failed-counter {
        color: currentColor;
      }

      :host([failed]) .failed-counter {
        color: #F44336;
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
      </style>
      <div class="item-container">
        <div class="item time-item">
          <template is="dom-if" if="[[!isFinished]]">
            <label>Scheduled:</label>
            <relative-time datetime$="[[computeIsoDate(item.startTime)]]"></relative-time>
          </template>
          <template is="dom-if" if="[[isFinished]]">
            <label>Ended:</label>
            <relative-time datetime$="[[computeIsoDate(item.endTime)]]"></relative-time>
          </template>
        </div>

        <div class="item">
          <label>Status:</label>
          <span class="test-status">[[item.status]]</span>
        </div>

        <div class="item">
          <label>Passed:</label>
          <span class="passed-counter">[[_computePassed(item.*)]]</span>
        </div>

        <div class="item numbers">
          <label>Failed:</label>
          <span class="failed-counter">[[_computeFailed(item.*)]]</span>
        </div>

        <div class="item numbers">
          <label>Tested:</label>
          <span class="size-counter">[[_computeSize(item.*)]]</span>
        </div>

        <div class="item numbers">
          <label>Ratio:</label>
          <span class="ration-counter">[[_computePassRatio(item.*)]]%</span>
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

        <a href="#/test-details/[[item.id]]">
          <paper-button>Details</paper-button>
        </a>
      </div>
    `}static get properties(){return{item:String,isAmfBuild:{type:Boolean,computed:"_computeIsAmfBuid(item.type)"},isFinished:{type:Boolean,value:!1,computed:"_computeIsFinished(item.status)"},failed:{type:Boolean,value:!1,reflectToAttribute:!0,computed:"_computeIsFailed(item)"},queued:{type:Boolean,reflectToAttribute:!0,computed:"_computeIsQueued(item.status)"}}}_computeIsAmfBuid(type){return"amf-build"===type}_computeIsFinished(status){return"finished"===status}_computeIsQueued(status){return"queued"===status}_computeIsFailed(item){if(!item){return!1}if("finished"!==item.status){return!1}if(item.failed&&0<item.failed){return!0}return!1}computeIsoDate(time){if(!time||isNaN(time)){return}const d=new Date(+time);return d.toISOString()}_computePassed(record){const item=record&&record.base,passed=item&&item.passed;return passed||"0"}_computeFailed(record){const item=record&&record.base,failed=item&&item.failed;return failed||"0"}_computeSize(record){const item=record&&record.base,size=item&&item.size||0;return size}_computePassRatio(record){const item=record&&record.base,passed=item&&item.passed||0,size=item&&item.size||0;if(!passed||!size){return 0}return Math.round(100*(passed/size))}}window.customElements.define("test-list-item",TestListItem);class ArcStatus extends PolymerElement{static get template(){return html`
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
      </style>
      <header>
        <h1>API components tests</h1>
        <paper-icon-button icon="apic:refresh" title="Refresh the view" on-click="refresh"></paper-icon-button>
      </header>
      <template is="dom-repeat" items="[[testsList]]">
        <test-list-item class="li" item="[[item]]"></test-list-item>
      </template>
      <tests-data-factory
        id="model"
        api-base="[[apiBase]]"
        list="{{testsList}}"
        has-more="{{hasMore}}"
        loading="{{loading}}"></tests-data-factory>
    `}static get properties(){return{testsList:{type:Array},apiBase:String,hasMore:{type:Boolean,value:!0},loading:{type:Boolean,notify:!0}}}refresh(){this.$.model.clean();this.$.model.loadNext()}}window.customElements.define("arc-status",ArcStatus);