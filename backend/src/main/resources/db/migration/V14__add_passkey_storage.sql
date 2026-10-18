create table user_entities
(
    id           varchar(1000) not null primary key,
    name         varchar(100)  not null,
    display_name varchar(200)
);

create table user_credentials
(
    credential_id                varchar(1000) not null primary key,
    user_entity_user_id          varchar(1000) not null,
    public_key                   bytea         not null,
    signature_count              bigint,
    uv_initialized               boolean,
    backup_eligible              boolean       not null,
    authenticator_transports     varchar(1000),
    public_key_credential_type   varchar(100),
    backup_state                 boolean       not null,
    attestation_object           bytea,
    attestation_client_data_json bytea,
    created                      timestamp,
    last_used                    timestamp,
    label                        varchar(1000) not null
);

create index ix_user_credentials_user_id on user_credentials (user_entity_user_id);
