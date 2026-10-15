FROM mysql/mysql-server:8.0

# Add init script
COPY init.sql /docker-entrypoint-initdb.d/

CMD ["mysqld", \
    "--explicit_defaults_for_timestamp", \
    "--early-plugin-load=keyring_file.so", \
    "--keyring_file_data=/var/lib/mysql/mysql-keyring/keyring"]
