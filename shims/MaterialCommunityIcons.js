"use strict";
// Shim CJS pour @expo/vector-icons/MaterialCommunityIcons
// Evite la chaîne ESM ('use client') que Metro ne peut pas résoudre
var React = require('react');
var Text = require('react-native').Text;

var glyphMap = require('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json');
var FONT_FAMILY = 'material-community';

function MaterialCommunityIcons(props) {
  var name = props.name;
  var size = props.size !== undefined ? props.size : 12;
  var color = props.color;
  var style = props.style;

  var glyph = glyphMap[name];
  if (glyph === undefined) return null;

  return React.createElement(
    Text,
    {
      selectable: false,
      style: [
        {
          fontFamily: FONT_FAMILY,
          fontSize: size,
          color: color,
          lineHeight: size * 1.2,
          textAlign: 'center',
        },
        style,
      ],
    },
    String.fromCodePoint(glyph)
  );
}

var ttf = require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf');
MaterialCommunityIcons.font = {};
MaterialCommunityIcons.font[FONT_FAMILY] = ttf;
MaterialCommunityIcons.glyphMap = glyphMap;
MaterialCommunityIcons.getFontFamily = function () { return FONT_FAMILY; };

module.exports = MaterialCommunityIcons;
module.exports.default = MaterialCommunityIcons;
