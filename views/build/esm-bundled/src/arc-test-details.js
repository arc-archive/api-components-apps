import{Base,Polymer,dom,html$1 as html,IronButtonState,IronControlState,PaperRippleBehavior,PolymerElement,html as html$1,afterNextRender}from"./apic-ci-status.js";class IronMeta{constructor(options){IronMeta[" "](options);this.type=options&&options.type||"default";this.key=options&&options.key;if(options&&"value"in options){this.value=options.value}}get value(){var type=this.type,key=this.key;if(type&&key){return IronMeta.types[type]&&IronMeta.types[type][key]}}set value(value){var type=this.type,key=this.key;if(type&&key){type=IronMeta.types[type]=IronMeta.types[type]||{};if(null==value){delete type[key]}else{type[key]=value}}}get list(){var type=this.type;if(type){var items=IronMeta.types[this.type];if(!items){return[]}return Object.keys(items).map(function(key){return metaDatas[this.type][key]},this)}}byKey(key){this.key=key;return this.value}}IronMeta[" "]=function(){};IronMeta.types={};var metaDatas=IronMeta.types;Polymer({is:"iron-meta",properties:{type:{type:String,value:"default"},key:{type:String},value:{type:String,notify:!0},self:{type:Boolean,observer:"_selfChanged"},__meta:{type:Boolean,computed:"__computeMeta(type, key, value)"}},hostAttributes:{hidden:!0},__computeMeta:function(type,key,value){var meta=new IronMeta({type:type,key:key});if(value!==void 0&&value!==meta.value){meta.value=value}else if(this.value!==meta.value){this.value=meta.value}return meta},get list(){return this.__meta&&this.__meta.list},_selfChanged:function(self){if(self){this.value=this}},byKey:function(key){return new IronMeta({type:this.type,key:key}).value}});var ironMeta={IronMeta:IronMeta};Polymer({_template:html`
    <style>
      :host {
        @apply --layout-inline;
        @apply --layout-center-center;
        position: relative;

        vertical-align: middle;

        fill: var(--iron-icon-fill-color, currentcolor);
        stroke: var(--iron-icon-stroke-color, none);

        width: var(--iron-icon-width, 24px);
        height: var(--iron-icon-height, 24px);
        @apply --iron-icon;
      }

      :host([hidden]) {
        display: none;
      }
    </style>
`,is:"iron-icon",properties:{icon:{type:String},theme:{type:String},src:{type:String},_meta:{value:Base.create("iron-meta",{type:"iconset"})}},observers:["_updateIcon(_meta, isAttached)","_updateIcon(theme, isAttached)","_srcChanged(src, isAttached)","_iconChanged(icon, isAttached)"],_DEFAULT_ICONSET:"icons",_iconChanged:function(icon){var parts=(icon||"").split(":");this._iconName=parts.pop();this._iconsetName=parts.pop()||this._DEFAULT_ICONSET;this._updateIcon()},_srcChanged:function(src){this._updateIcon()},_usesIconset:function(){return this.icon||!this.src},_updateIcon:function(){if(this._usesIconset()){if(this._img&&this._img.parentNode){dom(this.root).removeChild(this._img)}if(""===this._iconName){if(this._iconset){this._iconset.removeIcon(this)}}else if(this._iconsetName&&this._meta){this._iconset=this._meta.byKey(this._iconsetName);if(this._iconset){this._iconset.applyIcon(this,this._iconName,this.theme);this.unlisten(window,"iron-iconset-added","_updateIcon")}else{this.listen(window,"iron-iconset-added","_updateIcon")}}}else{if(this._iconset){this._iconset.removeIcon(this)}if(!this._img){this._img=document.createElement("img");this._img.style.width="100%";this._img.style.height="100%";this._img.draggable=!1}this._img.src=this.src;dom(this.root).appendChild(this._img)}}});Polymer({is:"iron-iconset-svg",properties:{name:{type:String,observer:"_nameChanged"},size:{type:Number,value:24},rtlMirroring:{type:Boolean,value:!1},useGlobalRtlAttribute:{type:Boolean,value:!1}},created:function(){this._meta=new IronMeta({type:"iconset",key:null,value:null})},attached:function(){this.style.display="none"},getIconNames:function(){this._icons=this._createIconMap();return Object.keys(this._icons).map(function(n){return this.name+":"+n},this)},applyIcon:function(element,iconName){this.removeIcon(element);var svg=this._cloneIcon(iconName,this.rtlMirroring&&this._targetIsRTL(element));if(svg){var pde=dom(element.root||element);pde.insertBefore(svg,pde.childNodes[0]);return element._svgIcon=svg}return null},removeIcon:function(element){if(element._svgIcon){dom(element.root||element).removeChild(element._svgIcon);element._svgIcon=null}},_targetIsRTL:function(target){if(null==this.__targetIsRTL){if(this.useGlobalRtlAttribute){var globalElement=document.body&&document.body.hasAttribute("dir")?document.body:document.documentElement;this.__targetIsRTL="rtl"===globalElement.getAttribute("dir")}else{if(target&&target.nodeType!==Node.ELEMENT_NODE){target=target.host}this.__targetIsRTL=target&&"rtl"===window.getComputedStyle(target).direction}}return this.__targetIsRTL},_nameChanged:function(){this._meta.value=null;this._meta.key=this.name;this._meta.value=this;this.async(function(){this.fire("iron-iconset-added",this,{node:window})})},_createIconMap:function(){var icons=Object.create(null);dom(this).querySelectorAll("[id]").forEach(function(icon){icons[icon.id]=icon});return icons},_cloneIcon:function(id,mirrorAllowed){this._icons=this._icons||this._createIconMap();return this._prepareSvgClone(this._icons[id],this.size,mirrorAllowed)},_prepareSvgClone:function(sourceSvg,size,mirrorAllowed){if(sourceSvg){var content=sourceSvg.cloneNode(!0),svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),viewBox=content.getAttribute("viewBox")||"0 0 "+size+" "+size,cssText="pointer-events: none; display: block; width: 100%; height: 100%;";if(mirrorAllowed&&content.hasAttribute("mirror-in-rtl")){cssText+="-webkit-transform:scale(-1,1);transform:scale(-1,1);transform-origin:center;"}svg.setAttribute("viewBox",viewBox);svg.setAttribute("preserveAspectRatio","xMidYMid meet");svg.setAttribute("focusable","false");svg.style.cssText=cssText;svg.appendChild(content).removeAttribute("id");return svg}return null}});const PaperInkyFocusBehaviorImpl={observers:["_focusedChanged(receivedFocusFromKeyboard)"],_focusedChanged:function(receivedFocusFromKeyboard){if(receivedFocusFromKeyboard){this.ensureRipple()}if(this.hasRipple()){this._ripple.holdDown=receivedFocusFromKeyboard}},_createRipple:function(){var ripple=PaperRippleBehavior._createRipple();ripple.id="ink";ripple.setAttribute("center","");ripple.classList.add("circle");return ripple}},PaperInkyFocusBehavior=[IronButtonState,IronControlState,PaperRippleBehavior,PaperInkyFocusBehaviorImpl];var paperInkyFocusBehavior={PaperInkyFocusBehaviorImpl:PaperInkyFocusBehaviorImpl,PaperInkyFocusBehavior:PaperInkyFocusBehavior};const template=html`
<custom-style>
  <style is="custom-style">
    html {
      /*
       * You can use these generic variables in your elements for easy theming.
       * For example, if all your elements use \`--primary-text-color\` as its main
       * color, then switching from a light to a dark theme is just a matter of
       * changing the value of \`--primary-text-color\` in your application.
       */
      --primary-text-color: var(--light-theme-text-color);
      --primary-background-color: var(--light-theme-background-color);
      --secondary-text-color: var(--light-theme-secondary-color);
      --disabled-text-color: var(--light-theme-disabled-color);
      --divider-color: var(--light-theme-divider-color);
      --error-color: var(--paper-deep-orange-a700);

      /*
       * Primary and accent colors. Also see color.js for more colors.
       */
      --primary-color: var(--paper-indigo-500);
      --light-primary-color: var(--paper-indigo-100);
      --dark-primary-color: var(--paper-indigo-700);

      --accent-color: var(--paper-pink-a200);
      --light-accent-color: var(--paper-pink-a100);
      --dark-accent-color: var(--paper-pink-a400);


      /*
       * Material Design Light background theme
       */
      --light-theme-background-color: #ffffff;
      --light-theme-base-color: #000000;
      --light-theme-text-color: var(--paper-grey-900);
      --light-theme-secondary-color: #737373;  /* for secondary text and icons */
      --light-theme-disabled-color: #9b9b9b;  /* disabled/hint text */
      --light-theme-divider-color: #dbdbdb;

      /*
       * Material Design Dark background theme
       */
      --dark-theme-background-color: var(--paper-grey-900);
      --dark-theme-base-color: #ffffff;
      --dark-theme-text-color: #ffffff;
      --dark-theme-secondary-color: #bcbcbc;  /* for secondary text and icons */
      --dark-theme-disabled-color: #646464;  /* disabled/hint text */
      --dark-theme-divider-color: #3c3c3c;

      /*
       * Deprecated values because of their confusing names.
       */
      --text-primary-color: var(--dark-theme-text-color);
      --default-primary-color: var(--primary-color);
    }
  </style>
</custom-style>`;template.setAttribute("style","display: none;");document.head.appendChild(template.content);const template$1=html`
<dom-module id="paper-icon-button">
  <template strip-whitespace>
    <style>
      :host {
        display: inline-block;
        position: relative;
        padding: 8px;
        outline: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        cursor: pointer;
        z-index: 0;
        line-height: 1;

        width: 40px;
        height: 40px;

        /* NOTE: Both values are needed, since some phones require the value to be \`transparent\`. */
        -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
        -webkit-tap-highlight-color: transparent;

        /* Because of polymer/2558, this style has lower specificity than * */
        box-sizing: border-box !important;

        @apply --paper-icon-button;
      }

      :host #ink {
        color: var(--paper-icon-button-ink-color, var(--primary-text-color));
        opacity: 0.6;
      }

      :host([disabled]) {
        color: var(--paper-icon-button-disabled-text, var(--disabled-text-color));
        pointer-events: none;
        cursor: auto;

        @apply --paper-icon-button-disabled;
      }

      :host([hidden]) {
        display: none !important;
      }

      :host(:hover) {
        @apply --paper-icon-button-hover;
      }

      iron-icon {
        --iron-icon-width: 100%;
        --iron-icon-height: 100%;
      }
    </style>

    <iron-icon id="icon" src="[[src]]" icon="[[icon]]" alt\$="[[alt]]"></iron-icon>
  </template>
</dom-module>
`;template$1.setAttribute("style","display: none;");document.body.appendChild(template$1.content);Polymer({is:"paper-icon-button",hostAttributes:{role:"button",tabindex:"0"},behaviors:[PaperInkyFocusBehavior],properties:{src:{type:String},icon:{type:String},alt:{type:String,observer:"_altChanged"}},_altChanged:function(newValue,oldValue){var label=this.getAttribute("aria-label");if(!label||oldValue==label){this.setAttribute("aria-label",newValue)}}});const $_documentContainer=document.createElement("template");$_documentContainer.innerHTML=`<iron-iconset-svg name="apic" size="24">
  <svg>
    <defs>
    <g id="arrow-back"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></g>
    <g id="details"><path d="M3 4l9 16 9-16H3zm3.38 2h11.25L12 16 6.38 6z"></path></g>
    <g id="refresh"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"></path></g>
    <g id="open-in-new"><path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"></path></g>
    </defs>
  </svg>
</iron-iconset-svg>`;document.head.appendChild($_documentContainer.content);const cachedData={},pageTokens={};class TestComponentsDataFactory extends PolymerElement{static get template(){return html$1`
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
    `}connectedCallback(){super.connectedCallback();const id=this.testId;if(id&&cachedData[id]){this._restoreCahce(cachedData[id])}}static get properties(){return{apiBase:String,testId:{type:String,observer:"_testIdChanged"},list:{type:Array,notify:!0},hasMore:{type:Boolean,value:!0,notify:!0},loading:{type:Boolean,notify:!0},requestParams:Object}}_testIdChanged(id){if(!id){if(this.hasMore){this.hasMore=!1}}else{const cache=cachedData[id];if(cache){this._restoreCahce(cache)}else{if(!this.hasMore){this.hasMore=!0}this.list=void 0}}}_restoreCahce(cache){this.list=cache.data;this.hasMore=cache.hasMore}loadNext(){const id=this.testId;if(!id){throw new Error("Test id is not set when calling the API.")}const apiBase=this.apiBase;if(!apiBase){throw new Error("The apiBase property is not set.")}const token=pageTokens[id];if(token){this.requestParams={nextPageToken:token}}else if(this.requestParams){this.requestParams=void 0}this.$.request.generateRequest()}_handleResponse(e){const id=this.testId;if(!id){return}const data=e.target.lastResponse;if(!data){return}const token=data.nextPageToken;pageTokens[id]=token;if(!cachedData[id]){cachedData[id]={}}this.hasMore=cachedData[id].hasMore=!!token;if(!this.list){cachedData[id].data=data.items;this.list=data.items}else{cachedData[id].data=cachedData[id].data.concat(data.items);this.list=this.list.concat(data.items)}}clean(){this.list=void 0;this.hasMore=void 0;const id=this.testId;if(!id){return}cachedData[id]=void 0;pageTokens[id]=void 0}}window.customElements.define("test-components-data-factory",TestComponentsDataFactory);const cachedData$1={},pageTokens$1={};class TestLogsDataFactory extends PolymerElement{static get template(){return html$1`
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
    `}static get properties(){return{apiBase:String,testId:String,componentName:String,list:{type:Array,notify:!0},hasMore:{type:Boolean,notify:!0},loading:{type:Boolean,notify:!0},requestParams:Object}}static get observers(){return["_paramsChanged(testId, componentName)"]}connectedCallback(){super.connectedCallback();const id=this.testId,name=this.componentName;if(id&&name&&cachedData$1[id]&&cachedData$1[id][name]){this._restoreCahce(cachedData$1[id][name])}}_paramsChanged(id,name){if(!id||!name){if(this.hasMore){this.hasMore=!1}return}const cache=cachedData$1[id]&&cachedData$1[id][name];if(cache){this._restoreCahce(cache)}else{if(!this.hasMore){this.hasMore=!0}this.list=void 0}}_restoreCahce(cache){this.list=cache.data;this.hasMore=cache.hasMore}loadNext(){const id=this.testId;if(!id){throw new Error("Test id is not set when calling the API.")}const name=this.componentName;if(!name){throw new Error("Component name is not set when calling the API.")}const apiBase=this.apiBase;if(!apiBase){throw new Error("The apiBase property is not set.")}const token=pageTokens$1[id]&&pageTokens$1[id][name];if(token){this.requestParams={nextPageToken:token}}else if(this.requestParams){this.requestParams=void 0}this.$.request.generateRequest()}_handleResponse(e){const id=this.testId;if(!id){return}const name=this.componentName;if(!name){return}const data=e.target.lastResponse,token=data.nextPageToken;if(!pageTokens$1[id]){pageTokens$1[id]={}}pageTokens$1[id][name]=token;if(!cachedData$1[id]){cachedData$1[id]={}}if(!cachedData$1[id][name]){cachedData$1[id][name]={}}this.hasMore=cachedData$1[id][name].hasMore=!!token;if(!this.list){cachedData$1[id][name].data=data.items;this.list=data.items}else{cachedData$1[id][name].data=cachedData$1[id][name].data.concat(data.items);this.list=this.list.concat(data.items)}}clean(){this.list=void 0;this.hasMore=void 0;const id=this.testId;if(!id){return}const name=this.componentName;if(!name){return}if(cachedData$1[id]){delete cachedData$1[id][name]}if(pageTokens$1[id]){delete pageTokens$1[id][name]}}}window.customElements.define("test-logs-data-factory",TestLogsDataFactory);class LogRenderer extends PolymerElement{static get template(){return html$1`
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
    `}static get properties(){return{logs:{type:Array,observer:"_logsChanged"},componentName:String,_logs:Array}}_logsChanged(logs){if(!logs||!logs.length){this._logs=void 0;return}const data=[];for(let i=0,len=logs.length;i<len;i++){const log=logs[i];let idPath="";for(let j=0,jLen=log.path.length;j<jLen;j++){const isLast=j+1===jLen;if(isLast){const obj={name:log.path[j],isTest:!0,indent:j,state:log.state,isFile:!1};data[data.length]=obj;continue}let dataHasPath=!1;idPath+=log.path[j];for(let k=0,kLen=data.length;k<kLen;k++){if(data[k].id===idPath){dataHasPath=!0;break}}if(dataHasPath){continue}const obj={id:idPath,name:log.path[j],isTest:!1,indent:j};if(0===j){obj.isFile=!0}else{obj.isFile=!1}data[data.length]=obj}}this._logs=data}_computeIndentStyle(indent){if(!indent){return""}const value=8*indent;return`padding-left: ${value}px`}}window.customElements.define("logs-renderer",LogRenderer);class ComponentLogsViewer extends PolymerElement{static get template(){return html$1`
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
    `}static get properties(){return{apiBase:String,testId:String,componentName:Boolean,loading:{type:Boolean},browsers:Array,hasMore:Boolean}}static get observers(){return["_requestDataObserver(hasMore, testId, componentName)"]}_requestDataObserver(hasMore,testId,componentName){if(!1===hasMore||!testId||!componentName||this.loading){return}afterNextRender(this,()=>{if(!this.browsers&&!this.loading){this.$.request.loadNext()}})}_hasLogs(logs){return!!(logs&&logs.length)}}window.customElements.define("component-logs-viewer",ComponentLogsViewer);class TestComponentListItem extends PolymerElement{static get template(){return html$1`
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
    `}static get properties(){return{item:String,failed:{type:Boolean,value:!1,reflectToAttribute:!0,computed:"_computeIsFailed(item)"},detailsOpened:Boolean,testId:String}}_computeIsFailed(item){if(!item){return!1}return"failed"===item.status}_computePassed(record){const item=record&&record.base,passed=item&&item.passed;return passed||"0"}_computeFailed(record){const item=record&&record.base,failed=item&&item.failed;return failed||"0"}_computePassRatio(record){const item=record&&record.base,passed=item&&item.passed||0,failed=item&&item.failed||0,size=passed+failed;if(!passed||!size){return 0}return Math.round(100*(passed/size))}toggleDetails(){this.detailsOpened=!this.detailsOpened}}window.customElements.define("test-component-list-item",TestComponentListItem);class ArcTestDetails extends PolymerElement{static get template(){return html$1`
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

      <tests-data-factory id="testFactory" api-base="[[apiBase]]" list="{{testsList}}" has-more="{{hasMore}}"></tests-data-factory>
      <test-components-data-factory
        id="request"
        api-base="[[apiBase]]"
        test-id="[[testId]]"
        list="{{componentsList}}"
        loading="{{loading}}"></test-components-data-factory>
    `}static get properties(){return{apiBase:String,testId:String,opened:Boolean,testsList:Array,componentsList:Array,loading:{type:Boolean,notify:!0},testDetail:{type:Object,computed:"_computeTestDetail(testsList, testId, opened)",notify:!0},testPassed:{type:Boolean,computed:"_computeTestPassed(testFinished, testDetail)"},testFinished:{type:Boolean,computed:"_computeTestFinished(testDetail.status)"},isAmfTest:{type:Boolean,computed:"_computeIsAmf(testDetail.type)"},hasMore:Boolean,isQueued:{type:Boolean,computed:"_computeTestQueued(testDetail.status)"}}}static get observers(){return["_requestDataObserver(opened, hasMore, testId)"]}_computeTestDetail(testsList,testId,opened){if(!opened||!testsList||!testsList.length||!testId){return}return testsList.find(item=>item.id===testId)}_requestDataObserver(opened,hasMore,testId){if(!opened||!1===hasMore||!testId||this.loading){return}afterNextRender(this,()=>{if(!this.componentsList&&!this.loading){this.$.request.loadNext()}})}_computeTestPassed(testFinished,test){if(!testFinished||!test){return!0}return 0===test.failed&&0<test.passed}_computeTestResult(testPassed){return testPassed?"Passed":"Failed"}_computeIsAmf(type){return"amf-build"===type}_computeTestFinished(status){return"finished"===status}_computeTestQueued(status){return"queued"===status}refresh(){this.$.request.clean();this.$.request.loadNext();this.$.testFactory.refreshTest(this.testId)}}window.customElements.define("arc-test-details",ArcTestDetails);export{ironMeta as $ironMeta,paperInkyFocusBehavior as $paperInkyFocusBehavior,IronMeta,PaperInkyFocusBehaviorImpl,PaperInkyFocusBehavior};