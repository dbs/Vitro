/* $This file is distributed under the terms of the license in /doc/license.txt$ */

//In this particular case, we are using this JavaScript in the case where we are employing an external template
//And NOT generating fields
//For now, we are only using this when creating an entirely new object, but later will incorporate editing functionality as well

var minimalCustomTemplate = {

    /* *** Initial page setup *** */
   fieldNameProperty : "customform:varName",
   configJSON:null,
    onLoad: function() {
    	 	this.mixIn();  
    		//Do ajax request to get config and only then trigger the rest
	    	$.ajax({
				  method: "GET",
				  url: this.configFileURL
				})
			  .done(function( content ) {
				  minimalCustomTemplate.configJSON = JSON.parse(content);
				  minimalCustomTemplate.initPage();
				//Bind event listeners only when everything on the page has been populated
		            //Putting in bind event listeners here - any autocomplete fields should already be setup
		            //As far as fields generated using AJAX requests - the event listeners should be attached
		            //in the done/success methods of the ajax requests
				  minimalCustomTemplate.bindEventListeners();
			  });      
            
        },

    mixIn: function() {

        // Get the custom form data from the page
        $.extend(this, customFormData);
        $.extend(this, i18nStrings);
    },

    // Initial page setup. Called only at page load.
    initPage: function() {
    	//hash to store form fields
		this.formFields = {};
		this.formFieldsToOptions = {};//Key is field name, but options saved as component
		this.allConfigComponents = {}; //Hash where key is @id
        
        this.processConfigJSON();
        //Generate fields method here used only for dropdown values
        this.generateFields();
        //If this is an EDITING operation, need to get existing values
        if(this.editMode == "edit") {
        	//Retrieve existing values if edit operation
        	this.retrieveExistingValueRequests();
        }
                       
    },
    //get existing values
    retrieveExistingValueRequests:function() {
    	var fieldName;
    	var existingValueRequests = [];
    	for(fieldName in this.formFields) {
    		var configComponent = this.formFields[fieldName];
    		//See if existing URI
    		if("customform:queryForExistingValue" in configComponent) {
    			existingValueRequests.push(configComponent);
    		}
    	}
    	
    	//Do an ajax request to get existing values
    	$.ajax({
			  method: "GET",
			  url: minimalCustomTemplate.customFormAJAXUrl,
			  data: { "configComponentsExistingValues": JSON.stringify(existingValueRequests),
				  "urisInScope":JSON.stringify(urisInScope),
				  "literalsInScope":JSON.stringify(literalsInScope),
				  "action":"existingValues"
			  }
			})
			  .done(function( content ) {
				  //templateclone is from URI Field, so make this work better
				  //Should retrieve a hash with var name to existing value
				  //and those can be used to populate the form
				  
			  });
    	
    },
    bindEventListeners:function() {
    	//This relies on the custom form with autocomplete file
    	//TODO: Find a better way to do this
    	if(customForm) {
    		customForm.onLoad();
    	}
    },
    
    //process the json and create a hash by varname/fieldname
    processConfigJSON: function() {
    	//Process the entire JSON to save all components by @id in hash
    	this.generateConfigHash();
    	
    	
		for(f in minimalCustomTemplate.allConfigComponents) {
    		var configComponent =  minimalCustomTemplate.allConfigComponents[f];
    		if(configComponent != null && ["customform:varName"] in configComponent) {
    			var fieldName = configComponent["customform:varName"];
    			this.formFields[fieldName] = configComponent;
    			//if form field has associated field options, store within formFieldsToFieldOptions hash
    			var fieldOptions = minimalCustomTemplate.getFieldOptions(configComponent);
    			if(fieldOptions != null) {
    				minimalCustomTemplate.formFieldsToOptions[fieldName] = fieldOptions;
    			}
    		}
		}
    },
   
    generateConfigHash : function() {
    	//Load configjson
    	var graph = minimalCustomTemplate.configJSON["@graph"];
    	var numberComponents = graph.length;
    	var n;
    	var fieldNameProperty = "customform:varName";
    	for(n = 0; n < numberComponents; n++) {
    		var component = graph[n];
    		var id = component["@id"];
    		minimalCustomTemplate.allConfigComponents[id] = component;
    	}
    },
    
    getFieldOptions: function(configComponent) {
    	var fieldOptionsFieldName = "customform:fieldOptions";
    	if(fieldOptionsFieldName in configComponent) {
    		var configId = configComponent[fieldOptionsFieldName]["@id"];
    		var configComponent = this.allConfigComponents[configId];
    		//TODO: Include check - whether this id even exists, etc.
    		return configComponent;
    	}
    	return null;
    	
    },
    generateFields: function() {
    	//date time has specific handling, do separately
    	//fields in order
    	//TODO: Have fields come in from ?json? file specifying display configuration
    	//Example: workHasActivityDisplayConfig
    	//activityType, agentType
    	
    	
    	for(var fieldName in this.formFields) {
    		if(fieldName in this.formFields) {
    			var configComponent = this.formFields[fieldName];
    			minimalCustomTemplate.displayConfigComponent(configComponent);
    		}
    	}
    	
    	
    	
    } ,
    //this is only the drop down here
    displayConfigComponent: function(configComponent) {
    	//Get fieldName
    	var fieldName = configComponent[minimalCustomTemplate.fieldNameProperty];
    	
    	if(fieldName in minimalCustomTemplate.formFieldsToOptions) {
    		var fieldOptionComponent = minimalCustomTemplate.formFieldsToOptions[fieldName];
    		//Just pass the entire JSON object to the servlet and let the servlet parse it
    		$.ajax({
    			  method: "GET",
    			  url: minimalCustomTemplate.customFormAJAXUrl,
    			  data: { "configComponent": JSON.stringify(fieldOptionComponent),
    				  		"fieldName": fieldName,
    				  		"action": "dropdown"
    			  }
    			})
    			  .done(function( content ) {
    				  //templateclone is from URI Field, so make this work better
    				  //templateClone = minimalCustomTemplate.createURIField(configComponent);
    				  minimalCustomTemplate.createDropdownField(fieldName, content);
    				  
    			  });
    	} 
    	
    	
    	
    },
    //sorty content by value
    //Each value can have one or more unique keys associated
    sortHashByValue:function(content) {
      var valueToKeysArray = {};
	  $.each(content, function(key, value) {
		  if(!value in valueToKeysArray) {
			 valueToKeysArray[value] = [];
		  }
		  var keysArray = valueToKeysArray[value];
		  
	  });
    },
  
    createDropdownField:function(varName, content) {
		  //populate drop downs
		  var dropdownElement = $("select#" + varName);
		  var htmlList = "";
		  //Sort content
		  //Get correct order of keys based on value
		  $.each(content, function(key, value) {
			  htmlList += "<option value='" + key + "'>" + value + "</option>";
			 
		  });
		  dropdownElement.empty().append(htmlList);
    },
    getVarName:function(configComponent) {
    	var varNameFieldName = "customform:varName";
    	if(varNameFieldName in configComponent)
    		return configComponent[varNameFieldName];
    	return null;
    },
    //field options need to be generated
    createFieldOptions:function(configComponent) {
    	return null;
    },
    getConfigurationComponent:function(componentName) {
    	var graph = minimalCustomTemplate.configJSON["@graph"];
    	var numberComponents = graph.length;
    	var n;
    	var fieldNameProperty = "customform:varName";
    	for(n = 0; n < numberComponents; n++) {
    		var component = graph[n];
    		//if field name property is contained within component
    		//Does this fall under massaging everything into a common format instead?
    		if(fieldNameProperty in component) {
	    		var fieldNamesArray = new Array().concat(component[fieldNameProperty]);
	    		
				var includedInArray = $.inArray(componentName, fieldNamesArray);
				if(includedInArray > -1) {
					return component;
				}
    		}
    			
    	}
    	return null;
    	
    }, 
    
    componentHasType: function(component, componentType) {
    	//returns array of types
    	var types = component["@type"];
    	var len = types.length;
    	var l;
    	for(l = 0; l < len; l++) {
    		var type = types[l];
    		if(type == componentType)
    			return true;
    	}
    	return false;
    }           
   

};

$(document).ready(function() {   
    minimalCustomTemplate.onLoad();
}); 