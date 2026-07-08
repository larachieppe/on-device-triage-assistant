// Registers .onnx as a binary asset so `require('.../model.quant.onnx')`
// resolves to an Asset (via expo-asset) instead of Metro trying to parse it
// as source.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("onnx");

module.exports = config;
