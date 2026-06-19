'use strict';

/**
 * Generic SPA Router with stack-based back navigation.
 * Integrated with Smart TV and mobile back events.
 */
class FrameworkRouter {
  constructor() {
    this.stack = [];
    this.routes = {};
    this.backExitArmed = false;
  }

  /**
   * Registers a screen layout.
   * @param {string} id - unique ID of the route
   * @param {string} elementId - DOM element ID representing this screen
   * @param {object} hooks - optional hooks { onEnter: () => {}, onLeave: () => {} }
   */
  registerRoute(id, elementId, hooks = {}) {
    this.routes[id] = {
      elementId,
      onEnter: hooks.onEnter || null,
      onLeave: hooks.onLeave || null
    };
  }

  /**
   * Navigates to a new screen, pushing the old one to the stack.
   */
  show(id) {
    const nextRoute = this.routes[id];
    if (!nextRoute) {
      console.warn(`[Router] Route ${id} not found.`);
      return;
    }

    const currentId = this.stack[this.stack.length - 1];
    if (currentId === id) return;

    // Trigger onLeave on current screen
    if (currentId) {
      const curRoute = this.routes[currentId];
      if (curRoute.onLeave) {
        try { curRoute.onLeave(); } catch (e) { console.error(e); }
      }
    }

    this.stack.push(id);
    this._activate(id);
  }

  /**
   * Navigates back.
   */
  back() {
    if (this.stack.length <= 1) {
      // At the root screen. Ask the React Native app shell to exit the app.
      if (window.ReactNativeWebView) {
        if (this.backExitArmed) {
          window.ReactNativeWebView.postMessage('back-at-root');
        } else {
          this.backExitArmed = true;
          this._showBackExitHint();
          setTimeout(() => { this.backExitArmed = false; }, 2000);
        }
      }
      return;
    }

    const currentId = this.stack.pop();
    const curRoute = this.routes[currentId];
    if (curRoute.onLeave) {
      try { curRoute.onLeave(); } catch (e) { console.error(e); }
    }

    const prevId = this.stack[this.stack.length - 1];
    this._activate(prevId);
  }

  /**
   * Resets stack to a single route.
   */
  resetTo(id) {
    // Clear whole stack
    while (this.stack.length > 0) {
      const currentId = this.stack.pop();
      const curRoute = this.routes[currentId];
      if (curRoute && curRoute.onLeave) {
        try { curRoute.onLeave(); } catch (e) { console.error(e); }
      }
    }
    this.stack = [id];
    this._activate(id);
  }

  _activate(id) {
    // Hide all registered screens, show target screen
    Object.values(this.routes).forEach(r => {
      const el = document.getElementById(r.elementId);
      if (el) {
        el.classList.remove('active');
        el.style.display = 'none';
      }
    });

    const route = this.routes[id];
    const el = document.getElementById(route.elementId);
    if (el) {
      el.classList.add('active');
      el.style.display = 'block';
    }

    // Trigger onEnter
    if (route.onEnter) {
      try { route.onEnter(); } catch (e) { console.error(e); }
    }

    // Dispatch global navigation event
    window.dispatchEvent(new CustomEvent('framework:navigated', { detail: { route: id } }));
  }

  _showBackExitHint() {
    let t = document.getElementById('cs-back-hint');
    if (!t) {
      t = document.createElement('div');
      t.id = 'cs-back-hint';
      t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:9999;white-space:nowrap;background:rgba(7,16,12,.94);color:#9ADF6B;border:1px solid rgba(154,223,107,.4);border-radius:99px;padding:10px 18px;font-size:13px;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.5);pointer-events:none;transition:opacity .25s';
      document.body.appendChild(t);
    }
    t.textContent = 'Press back again to exit';
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 1800);
  }
}

// Attach to global scope for easy access from script blocks
if (typeof window !== 'undefined') {
  window.FrameworkRouter = new FrameworkRouter();
  window.handleBackPress = () => { window.FrameworkRouter.back(); };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.FrameworkRouter;
}
