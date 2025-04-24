```
openssl genrsa -out key.pem 2048                              
openssl req -new -key key.pem -out cert.csr
openssl x509 -req -in cert.csr -signkey key.pem -out cert.pem -days 365
```