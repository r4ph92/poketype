#!/bin/sh
set -e
createdb --username "$POSTGRES_USER" poketype_test
