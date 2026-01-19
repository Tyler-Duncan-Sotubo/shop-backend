import {
  Body,
  Controller,
  Get,
  Post,
  BadRequestException,
  Res,
  Req,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { TrackEventDto } from './dto/track-event.dto';
import { StoresService } from 'src/domains/commerce/stores/stores.service';
import { StorefrontAnalyticsService } from 'src/domains/analytics/services/storefront-analytics.service';

@Controller('storefront/analytics')
export class AnalyticsController {
  constructor(
    private readonly sf: StorefrontAnalyticsService,
    private readonly domain: StoresService,
  ) {}

  @Get('tag.js')
  async tagJs(@Res() reply: FastifyReply) {
    const js = `
(function(){
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
    if(base) return base + "/track";
    return "/storefront/analytics/track";
  }

  function send(evt){
    try{
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

  var API = {
    get sessionId(){
      return getSessionId();
    },
    track: function(eventName, extra){
      var evt = extra || {};
      var s = API.sessionId;
      touchSession(s);

      evt.sessionId = s;
      evt.event = eventName;

      // NEW: domain-based tenant resolution
      try { evt.host = location.host || ""; } catch(e) { evt.host = ""; }

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

  if(!window.__sfAnalytics){
    window.__sfAnalytics = API;
  }else{
    window.__sfAnalytics.track = API.track;
    window.__sfAnalytics.page = API.page;
  }

  window.__sfAnalytics.page();
})();
`.trim();

    return reply
      .type('application/javascript; charset=utf-8')
      .header('Cache-Control', 'no-store')
      .send(js);
  }

  @Post('track')
  async track(@Req() req: FastifyRequest, @Body() dto: TrackEventDto) {
    // 1) Host is required (sent by tag.js)
    const rawHost = (dto.host || '').trim();
    if (!rawHost) throw new BadRequestException('Missing host');

    const host = this.domain.normalizeHost(rawHost); // use your normalizer
    if (!host) throw new BadRequestException('Missing host');
    const origin = String((req.headers as any).origin || '');

    if (origin) {
      let originHost = '';
      try {
        originHost = this.domain.normalizeHost(new URL(origin).host);
      } catch {
        throw new BadRequestException('Invalid Origin');
      }
      if (originHost !== host) {
        throw new BadRequestException('Origin/host mismatch');
      }
    }
    // If Origin is missing (some sendBeacon cases), we continue.

    // 3) Resolve tenant from verified domain mapping
    const mapping = await this.domain.resolveStoreByHost(host);
    if (!mapping) throw new BadRequestException('Unknown host');

    // 4) Track
    const stored = await this.sf.trackEvent({
      companyId: mapping.companyId,
      storeId: mapping.storeId ?? null,
      inputs: dto,
    });

    return { data: { ok: true, sessionId: dto.sessionId, stored } };
  }
}
