"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorefrontAnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_tag_service_1 = require("../services/analytics-tag.service");
const track_event_dto_1 = require("../dto/track-event.dto");
const storefront_analytics_service_1 = require("../services/storefront-analytics.service");
let StorefrontAnalyticsController = class StorefrontAnalyticsController {
    constructor(tags, sf) {
        this.tags = tags;
        this.sf = sf;
    }
    async tagJs(token, reply) {
        if (!token)
            throw new common_1.BadRequestException('Missing token');
        const tag = await this.tags.getActiveTagByToken(token);
        if (!tag)
            throw new common_1.BadRequestException('Invalid token');
        const js = `
(function(){
  var TOKEN = ${JSON.stringify(token)};
  var SCRIPT_ID = "internal-analytics-tag";

  // === GA-like session: 30 minutes of inactivity ===
  var SESSION_KEY = "sf_sess_v1";
  var SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

  function newId(now){
    try{
      return (crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(now) + "_" + Math.random().toString(16).slice(2);
    }catch(e){
      return String(now) + "_" + Math.random().toString(16).slice(2);
    }
  }

  function readSession(){
    try{
      var raw = localStorage.getItem(SESSION_KEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){
      return null;
    }
  }

  function writeSession(obj){
    try{
      localStorage.setItem(SESSION_KEY, JSON.stringify(obj));
    }catch(e){}
    return obj && obj.id ? obj.id : null;
  }

  // Returns a valid session id; rotates if inactive > 30min
  function getSessionId(){
    var now = Date.now();
    var s = readSession();

    if(!s || !s.id || !s.lastActivityAt){
      return writeSession({ id: newId(now), lastActivityAt: now }) || newId(now);
    }

    if(now - Number(s.lastActivityAt) > SESSION_TTL_MS){
      return writeSession({ id: newId(now), lastActivityAt: now }) || newId(now);
    }

    return s.id;
  }

  // Touch extends the session (like GA: any event extends)
  function touchSession(sessionId){
    try{
      writeSession({ id: sessionId, lastActivityAt: Date.now() });
    }catch(e){}
  }

  function getScriptSrc(){
    try{
      if(document.currentScript && document.currentScript.src) return document.currentScript.src;
      var el = document.getElementById(SCRIPT_ID);
      if(el && el.src) return el.src;
      var scripts = document.getElementsByTagName("script");
      if(scripts && scripts.length){
        var last = scripts[scripts.length-1];
        if(last && last.src) return last.src;
      }
    }catch(e){}
    return null;
  }

  function baseFromScript(){
    try{
      var src = getScriptSrc();
      if(!src) return null;
      var u = new URL(src);
      var basePath = u.pathname.replace(/\\/tag\\.js$/, "");
      return u.origin + basePath;
    }catch(e){
      return null;
    }
  }

  function trackUrl(){
    var base = baseFromScript();
    if(base) return base + "/track?token=" + encodeURIComponent(TOKEN);
    return "/storefront/analytics/track?token=" + encodeURIComponent(TOKEN);
  }

  function send(evt){
    try{
      // Defensive touch (ensures any sent event extends the session)
      if(evt && evt.sessionId) touchSession(evt.sessionId);

      var payload = JSON.stringify(evt);
      var url = trackUrl();
      if(navigator.sendBeacon){
        navigator.sendBeacon(url, new Blob([payload], {type:"application/json"}));
      }else{
        fetch(url,{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:payload,
          keepalive:true,
          credentials:"omit"
        });
      }
    }catch(e){}
  }

  // Expose a stable API
  var API = {
    get sessionId(){
      // Recompute every access so rollover can happen after inactivity
      return getSessionId();
    },
    track: function(eventName, extra){
      var evt = extra || {};
      var s = API.sessionId;
      touchSession(s);

      evt.sessionId = s;
      evt.event = eventName;
      send(evt);
    },
    page: function(){
      API.track("page_view", {
        path: location.pathname + location.search,
        referrer: document.referrer || "",
        title: document.title || ""
      });
    }
  };

  // Avoid clobbering if loaded twice
  if(!window.__sfAnalytics){
    window.__sfAnalytics = API;
  }else{
    // keep existing API object but refresh methods
    window.__sfAnalytics.track = API.track;
    window.__sfAnalytics.page = API.page;
    // sessionId is getter on API; old object might not have it, but track/page use getSessionId anyway
  }

  // Fire initial page view
  window.__sfAnalytics.page();
})();
`.trim();
        return (reply
            .type('application/javascript; charset=utf-8')
            .header('Cache-Control', 'no-store')
            .send(js));
    }
    async track(token, dto) {
        if (!token)
            throw new common_1.BadRequestException('Missing token');
        const tag = await this.tags.getActiveTagByToken(token);
        if (!tag)
            throw new common_1.BadRequestException('Invalid token');
        const data = await this.sf.trackEvent({ tag, dto });
        return { data: { ok: true, sessionId: dto.sessionId, stored: data } };
    }
};
exports.StorefrontAnalyticsController = StorefrontAnalyticsController;
__decorate([
    (0, common_1.Get)('tag.js'),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StorefrontAnalyticsController.prototype, "tagJs", null);
__decorate([
    (0, common_1.Post)('track'),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, track_event_dto_1.TrackEventDto]),
    __metadata("design:returntype", Promise)
], StorefrontAnalyticsController.prototype, "track", null);
exports.StorefrontAnalyticsController = StorefrontAnalyticsController = __decorate([
    (0, common_1.Controller)('storefront/analytics'),
    __metadata("design:paramtypes", [analytics_tag_service_1.AnalyticsTagService,
        storefront_analytics_service_1.StorefrontAnalyticsService])
], StorefrontAnalyticsController);
//# sourceMappingURL=storefront-analytics.controller.js.map