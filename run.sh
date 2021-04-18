#!/bin/sh

node index.js > out.txt && cat out.txt | pbcopy
