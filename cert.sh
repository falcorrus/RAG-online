#!/bin/bash
SUBDOMAIN=$1
if [ -z "$SUBDOMAIN" ]; then
    echo "Укажите поддомен, например: ./cert.sh yury"
    exit 1
fi
echo "🚀 Запуск процесса выдачи сертификата для ${SUBDOMAIN}.rag.reloto.ru на сервере..."
ssh root@server.reloto.ru "sudo /opt/RAG-online/setup_ssl.sh $SUBDOMAIN"
