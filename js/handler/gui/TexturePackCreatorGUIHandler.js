var TexturePackCreatorGUIHandler = function(){
  this.testTypes = ["BOX", "SPHERE", "SURFACE", "CYLINDER"];
  this.mockMaterial = new BasicMaterial({name: "test", color: "#ffffff", alpha: 1});
  this.mockAddedObject = new AddedObject(null, "MOCK");
  this.mockAddedObject.material = this.mockMaterial;
}

TexturePackCreatorGUIHandler.prototype.init = function(){
  this.configurations = {
    "Texture pack": "",
    "Test type": "BOX",
    "Done": function(){
      if (texturePackCreatorGUIHandler.isLoading){
        return;
      }
    },
    "Cancel": function(){
      if (texturePackCreatorGUIHandler.isLoading){
        return;
      }
      texturePackCreatorGUIHandler.close(Text.OPERATION_CANCELLED, false);
    }
  }
}

TexturePackCreatorGUIHandler.prototype.close = function(message, isError){
  guiHandler.hideAll();
  if (this.hiddenEngineObjects){
    for (var i = 0; i<this.hiddenEngineObjects.length; i++){
      this.hiddenEngineObjects[i].visible = true;
    }
  }
  if (this.testMesh){
    scene.remove(this.testMesh);
    this.disposeTestMesh();
    this.testMesh = 0;
  }
  if (this.texturePack){
    this.texturePack.destroy();
    this.texturePack = 0;
  }
  terminal.clear();
  terminal.enable();
  if (!isError){
    terminal.printInfo(message);
  }else{
    terminal.printError(message);
  }
}

TexturePackCreatorGUIHandler.prototype.mapTexturePack = function(){
  if (!this.testMesh || !this.texturePack){
    return;
  }
  this.mockAddedObject.mesh = this.testMesh;
  this.mockAddedObject.mapTexturePack(this.texturePack);
}

TexturePackCreatorGUIHandler.prototype.loadTexturePack = function(texturePackName, dirName){
  this.isLoading = true;
  terminal.clear();
  terminal.printInfo(Text.COMPRESSING_TEXTURE);
  if (this.testMesh){
    this.testMesh.visible = false;
  }
  guiHandler.disableController(this.texturePackController);
  guiHandler.disableController(this.testTypeController);
  guiHandler.disableController(this.cancelController);
  guiHandler.disableController(this.doneController);
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/prepareTexturePack", true);
  xhr.setRequestHeader("Content-type", "application/json");
  xhr.onreadystatechange = function (){
    if (xhr.readyState == 4 && xhr.status == 200){
      var resp = JSON.parse(xhr.responseText);
      if (resp.error){
        texturePackCreatorGUIHandler.isLoading = false;
        texturePackCreatorGUIHandler.close(Text.TEXTURE_COMPRESSION_ENCODE_ERROR.replace(Text.PARAM1, resp.texture).replace(Text.PARAM2, dirName), true);
        return;
      }
      terminal.printInfo(Text.TEXTURES_COMPRESSED);
      terminal.printInfo(Text.LOADING);
      if (texturePackCreatorGUIHandler.texturePack){
        texturePackCreatorGUIHandler.texturePack.destroy();
      }
      texturePackCreatorGUIHandler.texturePack = new TexturePack(texturePackName, dirName, resp, function(){
        terminal.clear();
        terminal.printInfo(Text.AFTER_TEXTURE_PACK_CREATION);
        guiHandler.enableController(texturePackCreatorGUIHandler.texturePackController);
        guiHandler.enableController(texturePackCreatorGUIHandler.testTypeController);
        guiHandler.enableController(texturePackCreatorGUIHandler.cancelController);
        guiHandler.enableController(texturePackCreatorGUIHandler.doneController);
        if (texturePackCreatorGUIHandler.testMesh){
          texturePackCreatorGUIHandler.testMesh.visible = true;
        }
        texturePackCreatorGUIHandler.mapTexturePack();
        texturePackCreatorGUIHandler.isLoading = false;
      });
      texturePackCreatorGUIHandler.texturePack.loadTextures();
    }
  }
  xhr.onerror = function(e){
    texturePackCreatorGUIHandler.isLoading = false;
    texturePackCreatorGUIHandler.close(Text.TEXTURE_COMPRESSION_ERROR.replace(Text.PARAM1, dirName), true);
  }
  xhr.send(JSON.stringify({texturePackName: texturePackCreatorGUIHandler.configurations["Texture pack"]}));
}

TexturePackCreatorGUIHandler.prototype.disposeTestMesh = function(){
  this.testMesh.geometry.dispose();
  if (!(typeof this.testMesh.material.uniforms.diffuseMap == UNDEFINED)){
    this.testMesh.material.uniforms.diffuseMap.value.dispose();
  }
  if (!(typeof this.testMesh.material.uniforms.alphaMap == UNDEFINED)){
    this.testMesh.material.uniforms.alphaMap.value.dispose();
  }
  if (!(typeof this.testMesh.material.uniforms.aoMap == UNDEFINED)){
    this.testMesh.material.uniforms.aoMap.value.dispose();
  }
  if (!(typeof this.testMesh.material.uniforms.emissiveMap == UNDEFINED)){
    this.testMesh.material.uniforms.emissiveMap.value.dispose();
  }
  if (!(typeof this.testMesh.material.uniforms.displacementMap == UNDEFINED)){
    this.testMesh.material.uniforms.displacementMap.value.dispose();
  }
  this.testMesh.material.dispose();
}

TexturePackCreatorGUIHandler.prototype.handleTestMesh = function(){
  if (this.testMesh){
    scene.remove(this.testMesh);
    this.disposeTestMesh();
    this.testMesh = 0;
  }
  var geometry;
  switch(this.configurations["Test type"]){
    case "BOX": geometry = new THREE.BoxBufferGeometry(50, 50, 50); break;
    case "SPHERE": geometry = new THREE.SphereBufferGeometry(25); break;
    case "SURFACE": geometry = new THREE.PlaneBufferGeometry(50, 50); break;
    case "CYLINDER": geometry = new THREE.CylinderBufferGeometry(25, 25, 20); break;
    default: throw new Error("Type not supported."); break;
  }
  this.testMesh = new MeshGenerator(geometry, this.mockMaterial).generateMesh();
  scene.add(this.testMesh);
  if (this.texturePack){
    this.mapTexturePack();
  }
}

TexturePackCreatorGUIHandler.prototype.show = function(texturePackName, folders){
  this.init();
  selectionHandler.resetCurrentSelection();
  guiHandler.hideAll();
  this.hiddenEngineObjects = [];
  for (var i = 0; i<scene.children.length; i++){
    var child = scene.children[i];
    if (child.visible){
      child.visible = false;
      this.hiddenEngineObjects.push(child);
    }
  }
  activeControl = new OrbitControls({maxRadius: 500, zoomDelta: 5});
  activeControl.onActivated();
  guiHandler.datGuiTexturePack = new dat.GUI({hideable: false});
  this.texturePackController =guiHandler.datGuiTexturePack.add(this.configurations, "Texture pack", folders).onChange(function(val){
    texturePackCreatorGUIHandler.loadTexturePack(texturePackName, val);
  }).listen();
  this.testTypeController =guiHandler.datGuiTexturePack.add(this.configurations, "Test type", this.testTypes).onChange(function(val){
    texturePackCreatorGUIHandler.handleTestMesh();
  }).listen();
  this.cancelController = guiHandler.datGuiTexturePack.add(this.configurations, "Cancel");
  this.doneController = guiHandler.datGuiTexturePack.add(this.configurations, "Done");
  this.configurations["Texture pack"] = folders[0];
  this.handleTestMesh();
  this.loadTexturePack(texturePackName, folders[0]);
}
