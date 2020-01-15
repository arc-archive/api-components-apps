const runtime=function(t) {
  'use strict'; const r=Object.prototype; const e=r.hasOwnProperty; const n='function'==typeof Symbol?Symbol:{}; const o=n.iterator||'@@iterator'; const i=n.asyncIterator||'@@asyncIterator'; const a=n.toStringTag||'@@toStringTag'; function c(t, r, e, n) {
    const o=r&&r.prototype instanceof f?r:f; const i=Object.create(o.prototype); const a=new E(n||[]); return i._invoke=function(t, r, e) {
      let n='suspendedStart'; return function(o, i) {
        if ('executing'===n) throw new Error('Generator is already running'); if ('completed'===n) {
          if ('throw'===o) throw i; return _();
        } for (e.method=o, e.arg=i; ;) {
          const a=e.delegate; if (a) {
            const c=w(a, e); if (c) {
              if (c===h) continue; return c;
            }
          } if ('next'===e.method)e.sent=e._sent=e.arg; else if ('throw'===e.method) {
            if ('suspendedStart'===n) throw n='completed', e.arg; e.dispatchException(e.arg);
          } else 'return'===e.method&&e.abrupt('return', e.arg); n='executing'; const f=u(t, r, e); if ('normal'===f.type) {
            if (n=e.done?'completed':'suspendedYield', f.arg===h) continue; return { value: f.arg, done: e.done };
          }'throw'===f.type&&(n='completed', e.method='throw', e.arg=f.arg);
        }
      };
    }(t, e, a), i;
  } function u(t, r, e) {
    try {
      return { type: 'normal', arg: t.call(r, e) };
    } catch (t) {
      return { type: 'throw', arg: t };
    }
  }t.wrap=c; var h={}; function f() {} function s() {} function l() {} let p={}; p[o]=function() {
    return this;
  }; const y=Object.getPrototypeOf; const v=y&&y(y(b([]))); v&&v!==r&&e.call(v, o)&&(p=v); const d=l.prototype=f.prototype=Object.create(p); function g(t) {
    ['next', 'throw', 'return'].forEach((function(r) {
      t[r]=function(t) {
        return this._invoke(r, t);
      };
    }));
  } function m(t) {
    let r; this._invoke=function(n, o) {
      function i() {
        return new Promise((function(r, i) {
          !function r(n, o, i, a) {
            const c=u(t[n], t, o); if ('throw'!==c.type) {
              const h=c.arg; const f=h.value; return f&&'object'==typeof f&&e.call(f, '__await')?Promise.resolve(f.__await).then((function(t) {
                r('next', t, i, a);
              }), (function(t) {
                r('throw', t, i, a);
              })):Promise.resolve(f).then((function(t) {
                h.value=t, i(h);
              }), (function(t) {
                return r('throw', t, i, a);
              }));
            }a(c.arg);
          }(n, o, r, i);
        }));
      } return r=r?r.then(i, i):i();
    };
  } function w(t, r) {
    const e=t.iterator[r.method]; if (void 0===e) {
      if (r.delegate=null, 'throw'===r.method) {
        if (t.iterator.return&&(r.method='return', r.arg=void 0, w(t, r), 'throw'===r.method)) return h; r.method='throw', r.arg=new TypeError('The iterator does not provide a \'throw\' method');
      } return h;
    } const n=u(e, t.iterator, r.arg); if ('throw'===n.type) return r.method='throw', r.arg=n.arg, r.delegate=null, h; const o=n.arg; return o?o.done?(r[t.resultName]=o.value, r.next=t.nextLoc, 'return'!==r.method&&(r.method='next', r.arg=void 0), r.delegate=null, h):o:(r.method='throw', r.arg=new TypeError('iterator result is not an object'), r.delegate=null, h);
  } function L(t) {
    const r={ tryLoc: t[0] }; 1 in t&&(r.catchLoc=t[1]), 2 in t&&(r.finallyLoc=t[2], r.afterLoc=t[3]), this.tryEntries.push(r);
  } function x(t) {
    const r=t.completion||{}; r.type='normal', delete r.arg, t.completion=r;
  } function E(t) {
    this.tryEntries=[{ tryLoc: 'root' }], t.forEach(L, this), this.reset(!0);
  } function b(t) {
    if (t) {
      const r=t[o]; if (r) return r.call(t); if ('function'==typeof t.next) return t; if (!isNaN(t.length)) {
        let n=-1; const i=function r() {
          for (;++n<t.length;) if (e.call(t, n)) return r.value=t[n], r.done=!1, r; return r.value=void 0, r.done=!0, r;
        }; return i.next=i;
      }
    } return { next: _ };
  } function _() {
    return { value: void 0, done: !0 };
  } return s.prototype=d.constructor=l, l.constructor=s, l[a]=s.displayName='GeneratorFunction', t.isGeneratorFunction=function(t) {
    const r='function'==typeof t&&t.constructor; return !!r&&(r===s||'GeneratorFunction'===(r.displayName||r.name));
  }, t.mark=function(t) {
    return Object.setPrototypeOf?Object.setPrototypeOf(t, l):(t.__proto__=l, a in t||(t[a]='GeneratorFunction')), t.prototype=Object.create(d), t;
  }, t.awrap=function(t) {
    return { __await: t };
  }, g(m.prototype), m.prototype[i]=function() {
    return this;
  }, t.AsyncIterator=m, t.async=function(r, e, n, o) {
    const i=new m(c(r, e, n, o)); return t.isGeneratorFunction(e)?i:i.next().then((function(t) {
      return t.done?t.value:i.next();
    }));
  }, g(d), d[a]='Generator', d[o]=function() {
    return this;
  }, d.toString=function() {
    return '[object Generator]';
  }, t.keys=function(t) {
    const r=[]; for (const e in t)r.push(e); return r.reverse(), function e() {
      for (;r.length;) {
        const n=r.pop(); if (n in t) return e.value=n, e.done=!1, e;
      } return e.done=!0, e;
    };
  }, t.values=b, E.prototype={ constructor: E, reset: function(t) {
    if (this.prev=0, this.next=0, this.sent=this._sent=void 0, this.done=!1, this.delegate=null, this.method='next', this.arg=void 0, this.tryEntries.forEach(x), !t) for (const r in this)'t'===r.charAt(0)&&e.call(this, r)&&!isNaN(+r.slice(1))&&(this[r]=void 0);
  }, stop: function() {
    this.done=!0; const t=this.tryEntries[0].completion; if ('throw'===t.type) throw t.arg; return this.rval;
  }, dispatchException: function(t) {
    if (this.done) throw t; const r=this; function n(e, n) {
      return a.type='throw', a.arg=t, r.next=e, n&&(r.method='next', r.arg=void 0), !!n;
    } for (let o=this.tryEntries.length-1; o>=0; --o) {
      const i=this.tryEntries[o]; var a=i.completion; if ('root'===i.tryLoc) return n('end'); if (i.tryLoc<=this.prev) {
        const c=e.call(i, 'catchLoc'); const u=e.call(i, 'finallyLoc'); if (c&&u) {
          if (this.prev<i.catchLoc) return n(i.catchLoc, !0); if (this.prev<i.finallyLoc) return n(i.finallyLoc);
        } else if (c) {
          if (this.prev<i.catchLoc) return n(i.catchLoc, !0);
        } else {
          if (!u) throw new Error('try statement without catch or finally'); if (this.prev<i.finallyLoc) return n(i.finallyLoc);
        }
      }
    }
  }, abrupt: function(t, r) {
    for (let n=this.tryEntries.length-1; n>=0; --n) {
      const o=this.tryEntries[n]; if (o.tryLoc<=this.prev&&e.call(o, 'finallyLoc')&&this.prev<o.finallyLoc) {
        var i=o; break;
      }
    }i&&('break'===t||'continue'===t)&&i.tryLoc<=r&&r<=i.finallyLoc&&(i=null); const a=i?i.completion:{}; return a.type=t, a.arg=r, i?(this.method='next', this.next=i.finallyLoc, h):this.complete(a);
  }, complete: function(t, r) {
    if ('throw'===t.type) throw t.arg; return 'break'===t.type||'continue'===t.type?this.next=t.arg:'return'===t.type?(this.rval=this.arg=t.arg, this.method='return', this.next='end'):'normal'===t.type&&r&&(this.next=r), h;
  }, finish: function(t) {
    for (let r=this.tryEntries.length-1; r>=0; --r) {
      const e=this.tryEntries[r]; if (e.finallyLoc===t) return this.complete(e.completion, e.afterLoc), x(e), h;
    }
  }, catch: function(t) {
    for (let r=this.tryEntries.length-1; r>=0; --r) {
      const e=this.tryEntries[r]; if (e.tryLoc===t) {
        const n=e.completion; if ('throw'===n.type) {
          var o=n.arg; x(e);
        } return o;
      }
    } throw new Error('illegal catch attempt');
  }, delegateYield: function(t, r, e) {
    return this.delegate={ iterator: b(t), resultName: r, nextLoc: e }, 'next'===this.method&&(this.arg=void 0), h;
  } }, t;
}('object'==typeof module?module.exports:{}); try {
  regeneratorRuntime=runtime;
} catch (t) {
  Function('r', 'regeneratorRuntime = r')(runtime);
}
