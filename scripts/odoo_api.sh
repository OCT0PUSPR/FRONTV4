#!/bin/bash
# Odoo API Helper Script
# Reusable script for making Odoo JSON-RPC calls

ODOO_URL="http://localhost:8069"
ODOO_DB="octopus"
ODOO_USER="aaa@example.com"
ODOO_PASS="2451999"
ODOO_UID=2

# Function to make JSON-RPC call
odoo_call() {
    local json_data="$1"
    curl -s -X POST "${ODOO_URL}/jsonrpc" \
        -H "Content-Type: application/json" \
        -d "$json_data"
}

# Function to authenticate and get UID
odoo_auth() {
    odoo_call '{
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "service": "common",
            "method": "authenticate",
            "args": ["'"${ODOO_DB}"'", "'"${ODOO_USER}"'", "'"${ODOO_PASS}"'", {}]
        },
        "id": 1
    }'
}

# Function to get model fields
odoo_fields_get() {
    local model="$1"
    local attributes="${2:-string,type,relation,help,selection}"
    odoo_call '{
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "service": "object",
            "method": "execute_kw",
            "args": ["'"${ODOO_DB}"'", '"${ODOO_UID}"', "'"${ODOO_PASS}"'", "'"${model}"'", "fields_get", [], {"attributes": ["'"${attributes//,/\",\"}"'"]}]
        },
        "id": 2
    }'
}

# Function to search and read records
odoo_search_read() {
    local model="$1"
    local domain="$2"
    local fields="$3"
    local limit="${4:-100}"
    odoo_call '{
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "service": "object",
            "method": "execute_kw",
            "args": ["'"${ODOO_DB}"'", '"${ODOO_UID}"', "'"${ODOO_PASS}"'", "'"${model}"'", "search_read", ['"${domain}"'], {"fields": '"${fields}"', "limit": '"${limit}"'}]
        },
        "id": 3
    }'
}

# Function to read specific records by IDs
odoo_read() {
    local model="$1"
    local ids="$2"
    local fields="$3"
    odoo_call '{
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "service": "object",
            "method": "execute_kw",
            "args": ["'"${ODOO_DB}"'", '"${ODOO_UID}"', "'"${ODOO_PASS}"'", "'"${model}"'", "read", ['"${ids}"'], {"fields": '"${fields}"'}]
        },
        "id": 4
    }'
}

# Main execution based on arguments
case "$1" in
    auth)
        odoo_auth
        ;;
    fields)
        odoo_fields_get "$2" "$3"
        ;;
    search)
        odoo_search_read "$2" "$3" "$4" "$5"
        ;;
    read)
        odoo_read "$2" "$3" "$4"
        ;;
    *)
        echo "Odoo API Helper Script"
        echo "Usage:"
        echo "  $0 auth                           - Authenticate and get UID"
        echo "  $0 fields <model> [attributes]    - Get model fields"
        echo "  $0 search <model> <domain> <fields> [limit] - Search and read"
        echo "  $0 read <model> <ids> <fields>    - Read specific records"
        echo ""
        echo "Examples:"
        echo "  $0 fields stock.picking.batch"
        echo "  $0 search stock.picking.batch '[]' '[\"name\",\"state\"]' 10"
        ;;
esac
