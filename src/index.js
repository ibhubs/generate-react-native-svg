#!/usr/bin/env node

/*
 * @flow
 */

import commander from 'commander';
import chalk from 'chalk';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import jsonParser from 'svg-json-parser';
import fs from 'fs';
import mkdirp from 'mkdirp';
import upperCamelCase from 'uppercamelcase';
import nunjucks from 'nunjucks';
import prettier from 'prettier';

const execute = util.promisify(exec);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const dirname = path.dirname(__dirname);
const parsedSVGPath = `${dirname}/temp/svg.json`;
const mustacheTemplatePath = `${dirname}/templates/SvgComponent.mustache`;
let outputPath = '';
nunjucks.configure(`${dirname}/templates`, { autoescape: true });

commander
  .option('-i, --input <path>', 'path of the svg file to be parsed')
  .option(
    '-o,   --output <path>',
    'path of the directory where the react-native-svg component to be saved'
  )
  .option('-d, --debug', 'debug the command')
  .parse(process.argv);

if (commander.input) {
  console.log(
    chalk.cyan('starting parsing svg from ') +
      ' ' +
      chalk.green(commander.input)
  );
  const svgPath = path.parse(commander.input);
  if (commander.debug) console.log(chalk.green(JSON.stringify(svgPath)));
  if (svgPath.ext === '.svg') {
    outputPath = commander.output;
    const outputParsedPath = path.parse(outputPath || '');
    if (!outputPath) {
      outputPath = `${process.cwd()}/${svgPath.name}.js`;
    } else if (outputParsedPath.ext === '') {
      outputPath = `${outputPath}/${svgPath.name}.js`;
    }
    if (commander.debug) console.log(chalk.cyan(outputPath));
    mkdirp(path.dirname(parsedSVGPath), function(error) {
      if (error) {
        if (commander.debug) console.log('Unable to parse svg to temp folder');
        return;
      }
      const svgData = jsonParser.load.file(
        `${commander.input}`,
        `${dirname}/temp/svg`
      );
      renderTemplate(svgData);
    });
  } else {
    console.error(chalk.red('Enter valid svg'));
    process.exit();
  }
} else {
  console.error(
    chalk.red('Enter valid svg', commander.input, commander.output)
  );
  process.exit();
}

function getJSXTag(tag) {
  if (commander.debug) console.log(chalk.red(`tag: ${tag}`));
  return upperCamelCase(tag);
}

function processPropValue(value) {
  return value.replace(/px$/, '');
}

function renderProps(attributes, level) {
  let props = '';
  const keys = Object.keys(attributes);
  console.log('attributes ', JSON.stringify(attributes), JSON.stringify(keys));
  keys.forEach(function(key) {
    if (key !== 'transform')
      props += `${key}=\"${processPropValue(attributes[key])}\"\n`;
    else {
      let transforms = attributes[key].split(/\)\s/);
      transforms = transforms.reduce(function(result, transform) {
        console.log(result, /\)$/.test(transform));
        let transformString = transform;
        if (/\)$/.test(transform)) {
          transformString = transform.replace(/\)$/, '');
        }
        const transformContents = transformString.split(/\(/);
        return result.concat(
          `${transformContents[0]}:\"${transformContents[1]}\",`
        );
      }, `${key}={{`);
      console.log(chalk.cyan(JSON.stringify(`${transforms}}`)));
      props += `${transforms}}}\n`;
    }
  });
  return props;
}

function isValidTag(tag) {
  return [
    'Svg',
    'Circle',
    'Ellipse',
    'G',
    'LinearGradient',
    'RadialGradient',
    'Line',
    'Path',
    'Polygon',
    'Polyline',
    'Rect',
    'Symbol',
    'Text',
    'TextPath',
    'TSpan',
    'ClipPath',
    'Image',
    'Use',
    'Defs',
    'Stop'
  ].includes(tag);
}

function renderChildren(children) {
  return nunjucks.render('Children.njk', {
    children,
    renderChildren,
    renderTag: getJSXTag,
    isValidTag,
    renderProps
  });
}

function renderSVGComponent() {}

function renderTemplate(svgData) {
  let renderedSVG = nunjucks.render('SvgComponent.njk', {
    ...svgData,
    renderTag: getJSXTag,
    renderProps,
    renderChildren
  });
  renderedSVG = prettier.format(renderedSVG, { singleQuote: true });
  console.log(chalk.yellow(renderedSVG));
  writeFile(outputPath, renderedSVG).then(function() {
    console.log(chalk.green('Success'));
  });
}
