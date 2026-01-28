var Settings = (function() {
  var defaults = {
    TEMPLATE_ID: '',
    OUTPUT_FOLDER_ID: '',
    UPLOAD_FOLDER_ID: '',
    LOG_SHEET_ID: '',
    ALLOWED_DOMAIN: ''
  };

  function get(key) {
    var value = PropertiesService.getScriptProperties().getProperty(key);
    if (!value) {
      value = defaults[key] || '';
    }
    return value;
  }

  function set(key, value) {
    PropertiesService.getScriptProperties().setProperty(key, value);
  }

  return {
    get: get,
    set: set
  };
})();
