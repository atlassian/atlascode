#!/bin/bash 

# Function to generate certificates for a service
generate_service_cert() {
    local service_name=$1
    local domain_name=$2
    # Shift away the first two parameters so that "$@" contains only extra domains
    shift 2
    local extra_domains=("$@")
    local has_extra_domains=$((${#extra_domains[@]} > 0))

    echo "Generating certificates for ${service_name} with domains ${domain_name} ${extra_domains[@]}..."

    cat >${service_name}.conf <<EOF
[ req ]
default_bits = 4096
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn

[ dn ]
C = US
ST = Washington
L = Bellevue
O = Atlascode
CN = ${domain_name}

[ req_ext ]
subjectAltName = @alt_names

[ v3_ext ]
authorityKeyIdentifier=keyid,issuer:always
basicConstraints=CA:FALSE
keyUsage=keyEncipherment,dataEncipherment
extendedKeyUsage=serverAuth,clientAuth
subjectAltName=@alt_names

# alt_names contains all the domain certified by this certificate, including the main domain
[ alt_names ]
DNS.1 = ${domain_name}
EOF
    
    if [ $has_extra_domains -eq 1 ]; then
        local dns_index=2
        for extra_domain in "${extra_domains[@]}"; do
            echo "DNS.$dns_index = ${extra_domain}" >>${service_name}.conf
            dns_index=$((dns_index+1))
        done
    fi

    # Generates a 4096-bit RSA private key for this certificate
    openssl genrsa -out ${service_name}.key 4096

    # Generate a sign requests for this certificate    
    openssl req -new -nodes -key ${service_name}.key -out ${service_name}.csr \
        -config ${service_name}.conf

    # Signs this certificate with the CA we have created
    openssl x509 -req -in ${service_name}.csr -CA rootCA.crt -CAkey rootCA.key -CAcreateserial -out ${service_name}.crt -days 3650 \
        -extensions v3_ext \
        -extfile ${service_name}.conf

    # Creates a PKCS#12 Keystore with password = "password"
    # Note: wiremock uses the password "password" by default without specifying one    
    openssl pkcs12 -export -out ${service_name}.p12 -inkey ${service_name}.key -in ${service_name}.crt -name "${service_name} cert" -passout pass:password

    rm ${service_name}.key
    rm ${service_name}.csr
    rm ${service_name}.crt
    rm ${service_name}.conf

    echo "Certificates for ${service_name} generated successfully."
}

# Generates a 4096-bit RSA private key for the CA
openssl genrsa -out rootCA.key 4096

# Creates a self-signed CA certificate valid for 10 years
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 3650 -out rootCA.crt -subj "/C=US/ST=Washington/L=Bellevue/O=Atlascode/CN=Atlascode CA"

# Generates a certificate for both Jira Cloud and DC domains
generate_service_cert "wiremock-mockedteams" "mockedteams.atlassian.net" "jira.mockeddomain.com"

# # Generates a certificate for bitbucket.mockeddomain.com
generate_service_cert "wiremock-bitbucket" "bitbucket.mockeddomain.com"

rm rootCA.key
rm rootCA.srl