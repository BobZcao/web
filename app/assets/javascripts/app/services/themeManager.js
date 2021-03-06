class ThemeManager {

  constructor(componentManager, desktopManager) {
    this.componentManager = componentManager;

    desktopManager.registerUpdateObserver((component) => {
      // Reload theme if active
      if(component.active && component.isTheme()) {
        this.deactivateTheme(component);
        setTimeout(() => {
          this.activateTheme(component);
        }, 10);
      }
    })

    componentManager.registerHandler({identifier: "themeManager", areas: ["themes"], activationHandler: (component) => {
      if(component.active) {
        this.activateTheme(component);
      } else {
        this.deactivateTheme(component);
      }
    }});
  }

  activateTheme(theme) {
    var url = this.componentManager.urlForComponent(theme);
    var link = document.createElement("link");
    link.href = url;
    link.type = "text/css";
    link.rel = "stylesheet";
    link.media = "screen,print";
    link.id = theme.uuid;
    document.getElementsByTagName("head")[0].appendChild(link);
  }

  deactivateTheme(theme) {
    var element = document.getElementById(theme.uuid);
    if(element) {
      element.disabled = true;
      element.parentNode.removeChild(element);
    }
  }
}

angular.module('app').service('themeManager', ThemeManager);
