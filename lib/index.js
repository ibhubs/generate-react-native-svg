#!/usr/bin/env node
'use strict';

var _commander = require('commander');

var _commander2 = _interopRequireDefault(_commander);

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

var _child_process = require('child_process');

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _svgJsonParser = require('svg-json-parser');

var _svgJsonParser2 = _interopRequireDefault(_svgJsonParser);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _uppercamelcase = require('uppercamelcase');

var _uppercamelcase2 = _interopRequireDefault(_uppercamelcase);

var _nunjucks = require('nunjucks');

var _nunjucks2 = _interopRequireDefault(_nunjucks);

var _prettier = require('prettier');

var _prettier2 = _interopRequireDefault(_prettier);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/*
 * @flow
 */

var execute = _util2.default.promisify(_child_process.exec);
var readFile = _util2.default.promisify(_fs2.default.readFile);
var writeFile = _util2.default.promisify(_fs2.default.writeFile);

var dirname = _path2.default.dirname(__dirname);
var parsedSVGPath = dirname + '/temp/svg.json';
var mustacheTemplatePath = dirname + '/templates/SvgComponent.mustache';
var outputPath = '';
_nunjucks2.default.configure(dirname + '/templates', { autoescape: true });

_commander2.default.option('-i, --input <path>', 'path of the svg file to be parsed').option('-o,   --output <path>', 'path of the directory where the react-native-svg component to be saved').option('-d, --debug', 'debug the command').parse(process.argv);

if (_commander2.default.input) {
  console.log(_chalk2.default.cyan('starting parsing svg from ') + ' ' + _chalk2.default.green(_commander2.default.input));
  var svgPath = _path2.default.parse(_commander2.default.input);
  if (_commander2.default.debug) console.log(_chalk2.default.green(JSON.stringify(svgPath)));
  if (svgPath.ext === '.svg') {
    outputPath = _commander2.default.output;
    var outputParsedPath = _path2.default.parse(outputPath || '');
    if (!outputPath) {
      outputPath = process.cwd() + '/' + svgPath.name + '.js';
    } else if (outputParsedPath.ext === '') {
      outputPath = outputPath + '/' + svgPath.name + '.js';
    }
    if (_commander2.default.debug) console.log(_chalk2.default.cyan(outputPath));
    (0, _mkdirp2.default)(_path2.default.dirname(parsedSVGPath), function (error) {
      if (error) {
        if (_commander2.default.debug) console.log('Unable to parse svg to temp folder');
        return;
      }
      var svgData = _svgJsonParser2.default.load.file('' + _commander2.default.input, dirname + '/temp/svg');
      renderTemplate(svgData);
    });
  } else {
    console.error(_chalk2.default.red('Enter valid svg'));
    process.exit();
  }
} else {
  console.error(_chalk2.default.red('Enter valid svg', _commander2.default.input, _commander2.default.output));
  process.exit();
}

function getJSXTag(tag) {
  return (0, _uppercamelcase2.default)(tag);
}

function processPropValue(value) {
  return value.replace(/px$/, '');
}

function renderProps(attributes, level) {
  var props = '';
  var keys = Object.keys(attributes);
  console.log('attributes ', JSON.stringify(attributes), JSON.stringify(keys));
  keys.forEach(function (key) {
    if (key !== 'transform') props += key + '="' + processPropValue(attributes[key]) + '"\n';else {
      var transforms = attributes[key].split(/\)\s/);
      transforms = transforms.reduce(function (result, transform) {
        console.log(result, /\)$/.test(transform));
        var transformString = transform;
        if (/\)$/.test(transform)) {
          transformString = transform.replace(/\)$/, '');
        }
        var transformContents = transformString.split(/\(/);
        return result.concat(transformContents[0] + ':"' + transformContents[1] + '",');
      }, key + '={{');
      console.log(_chalk2.default.cyan(JSON.stringify(transforms + '}')));
      props += transforms + '}}\n';
    }
  });
  return props;
}

function isValidTag(tag) {
  return ['Svg', 'Circle', 'Ellipse', 'G', 'LinearGradient', 'RadialGradient', 'Line', 'Path', 'Polygon', 'Polyline', 'Rect', 'Symbol', 'Text', 'TextPath', 'TSpan', 'ClipPath', 'Image', 'Use', 'Defs', 'Stop'].includes(tag);
}

function renderChildren(children) {
  return _nunjucks2.default.render('Children.njk', {
    children: children,
    renderChildren: renderChildren,
    renderTag: getJSXTag,
    isValidTag: isValidTag,
    renderProps: renderProps
  });
}

function getTagsFromSvgChild(tags, child) {
  if (Array.isArray(tags)) {
    var validTag = getJSXTag(child.tag);
    if (isValidTag(validTag)) {
      return tags.concat.apply(tags, [validTag].concat(_toConsumableArray(getTags(child.children))));
    }
  }
  return [];
}

function getTags(children) {
  if (Array.isArray(children)) {
    return children.reduce(getTagsFromSvgChild, []);
  }
  return [];
}

function getTagsString(children) {
  if (Array.isArray(children)) {
    var tagsString = [].concat(_toConsumableArray(new Set(getTags(children)))).reduce(function (tagString, tag) {
      return tagString + ' ' + tag + ',';
    }, '{') + '}';
    if (_commander2.default.debug) console.log('import string ', _chalk2.default.green(tagsString));
    return tagsString;
  }
  return '';
}

function renderSVGComponent() {}

function renderTemplate(svgData) {
  var renderedSVG = _nunjucks2.default.render('SvgComponent.njk', {
    ...svgData,
    renderTag: getJSXTag,
    renderProps: renderProps,
    renderChildren: renderChildren,
    getTagsString: getTagsString
  });
  renderedSVG = _prettier2.default.format(renderedSVG, { singleQuote: true });
  console.log(_chalk2.default.yellow(renderedSVG));
  writeFile(outputPath, renderedSVG).then(function () {
    console.log(_chalk2.default.green('Success'));
  });
}