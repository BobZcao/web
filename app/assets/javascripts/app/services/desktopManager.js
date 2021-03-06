// An interface used by the Desktop app to interact with SN

class DesktopManager {

  constructor($rootScope, $timeout, modelManager, syncManager, authManager, passcodeManager) {
    this.passcodeManager = passcodeManager;
    this.modelManager = modelManager;
    this.authManager = authManager;
    this.syncManager = syncManager;
    this.$rootScope = $rootScope;
    this.timeout = $timeout;
    this.updateObservers = [];

    this.isDesktop = isDesktopApplication();

    $rootScope.$on("initial-data-loaded", () => {
      this.dataLoaded = true;
      if(this.dataLoadHandler) {
        this.dataLoadHandler();
      }
    });

    $rootScope.$on("major-data-change", () => {
      if(this.majorDataChangeHandler) {
        this.majorDataChangeHandler();
      }
    })
  }

  getApplicationDataPath() {
    console.assert(this.applicationDataPath, "applicationDataPath is null");
    return this.applicationDataPath;
  }

  /* Sending a component in its raw state is really slow for the desktop app */
  convertComponentForTransmission(component) {
    return new ItemParams(component).paramsForExportFile(true);
  }

  // All `components` should be installed
  syncComponentsInstallation(components) {
    if(!this.isDesktop) return;

    var data = components.map((component) => {
      return this.convertComponentForTransmission(component);
    })
    this.installationSyncHandler(data);
  }

  installComponent(component) {
    this.installComponentHandler(this.convertComponentForTransmission(component));
  }

  registerUpdateObserver(callback) {
    var observer = {id: Math.random, callback: callback};
    this.updateObservers.push(observer);
    return observer;
  }

  deregisterUpdateObserver(observer) {
    _.pull(this.updateObservers, observer);
  }

  desktop_onComponentInstallationComplete(componentData, error) {
    console.log("Web|Component Installation/Update Complete", componentData, error);

    // Desktop is only allowed to change these keys:
    let permissableKeys = ["package_info", "local_url"];
    var component = this.modelManager.findItem(componentData.uuid);

    if(!component) {
      console.error("desktop_onComponentInstallationComplete component is null for uuid", componentData.uuid);
      return;
    }

    if(error) {
      component.setAppDataItem("installError", error);
    } else {
      for(var key of permissableKeys) {
        component[key] = componentData.content[key];
      }
      this.modelManager.notifySyncObserversOfModels([component], ModelManager.MappingSourceDesktopInstalled);
      component.setAppDataItem("installError", null);
    }
    component.setDirty(true);
    this.syncManager.sync("onComponentInstallationComplete");

    this.timeout(() => {
      for(var observer of this.updateObservers) {
        observer.callback(component);
      }
    })
  }

  /* Used to resolve "sn://" */
  desktop_setApplicationDataPath(path) {
    this.applicationDataPath = path;
  }

  desktop_setComponentInstallationSyncHandler(handler) {
    this.installationSyncHandler = handler;
  }

  desktop_setInstallComponentHandler(handler) {
    this.installComponentHandler = handler;
  }

  desktop_setInitialDataLoadHandler(handler) {
    this.dataLoadHandler = handler;
    if(this.dataLoaded) {
      this.dataLoadHandler();
    }
  }

  desktop_requestBackupFile() {
    var keys, authParams, protocolVersion;
    if(this.authManager.offline() && this.passcodeManager.hasPasscode()) {
      keys = this.passcodeManager.keys();
      authParams = this.passcodeManager.passcodeAuthParams();
      protocolVersion = authParams.version;
    } else {
      keys = this.authManager.keys();
      authParams = this.authManager.getAuthParams();
      protocolVersion = this.authManager.protocolVersion();
    }

    let data = this.modelManager.getAllItemsJSONData(
      keys,
      authParams,
      protocolVersion,
      true /* return null on empty */
    );
    return data;
  }

  desktop_setMajorDataChangeHandler(handler) {
    this.majorDataChangeHandler = handler;
  }

}

angular.module('app').service('desktopManager', DesktopManager);
