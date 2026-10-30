# DNS providers

Source: `providers/dns/*/*.toml` of lego v5.5.2. The code is what Traefik's `dnsChallenge.provider` takes.

| Provider | Code | Credentials |
|---|---|---|
| 1cloud.ru | `onecloudru` | `ONECLOUDRU_TOKEN` |
| 35.com/三五互联 | `com35` | `COM35_USERNAME`, `COM35_PASSWORD` |
| 51DNS | `dns51` | `DNS51_API_KEY`, `DNS51_API_SECRET` |
| Abion | `abion` | `ABION_API_KEY` |
| Active24 | `active24` | `ACTIVE24_API_KEY`, `ACTIVE24_SECRET` |
| Akamai EdgeDNS | `edgedns` | `AKAMAI_HOST`, `AKAMAI_CLIENT_TOKEN`, `AKAMAI_CLIENT_SECRET`, `AKAMAI_ACCESS_TOKEN`, `AKAMAI_EDGERC`, `AKAMAI_EDGERC_SECTION` |
| Alibaba Cloud DNS | `alidns` | `ALICLOUD_RAM_ROLE`, `ALICLOUD_ACCESS_KEY`, `ALICLOUD_SECRET_KEY`, `ALICLOUD_SECURITY_TOKEN` |
| AlibabaCloud ESA | `aliesa` | `ALIESA_RAM_ROLE`, `ALIESA_ACCESS_KEY`, `ALIESA_SECRET_KEY`, `ALIESA_SECURITY_TOKEN` |
| all-inkl | `allinkl` | `ALL_INKL_LOGIN`, `ALL_INKL_PASSWORD` |
| Alwaysdata | `alwaysdata` | `ALWAYSDATA_API_KEY` |
| Amazon Lightsail | `lightsail` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `DNS_ZONE` |
| Amazon Route 53 | `route53` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_HOSTED_ZONE_ID`, `AWS_PROFILE`, `AWS_SDK_LOAD_CONFIG`, `AWS_ASSUME_ROLE_ARN`, `AWS_EXTERNAL_ID`, `AWS_WAIT_FOR_RECORD_SETS_CHANGED` |
| Anexia CloudDNS | `anexia` | `ANEXIA_TOKEN` |
| ANS SafeDNS | `safedns` | `SAFEDNS_AUTH_TOKEN` |
| ArtFiles | `artfiles` | `ARTFILES_USERNAME`, `ARTFILES_PASSWORD` |
| ArvanCloud | `arvancloud` | `ARVANCLOUD_API_KEY` |
| Aurora DNS | `auroradns` | `AURORA_API_KEY`, `AURORA_SECRET` |
| Autodns | `autodns` | `AUTODNS_API_USER`, `AUTODNS_API_PASSWORD` |
| Axelname | `axelname` | `AXELNAME_NICKNAME`, `AXELNAME_TOKEN` |
| Azion | `azion` | `AZION_PERSONAL_TOKEN` |
| Azure DNS | `azuredns` | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID`, `AZURE_CLIENT_CERTIFICATE_PATH` |
| Baidu Cloud | `baiducloud` | `BAIDUCLOUD_ACCESS_KEY_ID`, `BAIDUCLOUD_SECRET_ACCESS_KEY` |
| Beget.com | `beget` | `BEGET_USERNAME`, `BEGET_PASSWORD` |
| Binary Lane | `binarylane` | `BINARYLANE_API_TOKEN` |
| Bindman | `bindman` | `BINDMAN_MANAGER_ADDRESS` |
| Bluecat | `bluecat` | `BLUECAT_SERVER_URL`, `BLUECAT_USER_NAME`, `BLUECAT_PASSWORD`, `BLUECAT_CONFIG_NAME`, `BLUECAT_DNS_VIEW` |
| Bluecat v2 | `bluecatv2` | `BLUECATV2_SERVER_URL`, `BLUECATV2_USERNAME`, `BLUECATV2_PASSWORD`, `BLUECATV2_CONFIG_NAME`, `BLUECATV2_VIEW_NAME` |
| BookMyName | `bookmyname` | `BOOKMYNAME_USERNAME`, `BOOKMYNAME_PASSWORD` |
| Bunny | `bunny` | `BUNNY_API_KEY` |
| Checkdomain | `checkdomain` | `CHECKDOMAIN_TOKEN` |
| Civo | `civo` | `CIVO_TOKEN` |
| Cloud.ru | `cloudru` | `CLOUDRU_SERVICE_INSTANCE_ID`, `CLOUDRU_KEY_ID`, `CLOUDRU_SECRET` |
| CloudDNS | `clouddns` | `CLOUDDNS_CLIENT_ID`, `CLOUDDNS_EMAIL`, `CLOUDDNS_PASSWORD` |
| Cloudflare | `cloudflare` | `CF_API_EMAIL`, `CF_API_KEY`, `CF_DNS_API_TOKEN`, `CF_ZONE_API_TOKEN`, `CLOUDFLARE_EMAIL`, `CLOUDFLARE_API_KEY`, `CLOUDFLARE_DNS_API_TOKEN`, `CLOUDFLARE_ZONE_API_TOKEN` |
| ClouDNS | `cloudns` | `CLOUDNS_AUTH_ID`, `CLOUDNS_AUTH_PASSWORD` |
| Connbyte | `connbyte` | `CONNBYTE_TOKEN` |
| ConoHa v2 | `conoha` | `CONOHA_TENANT_ID`, `CONOHA_API_USERNAME`, `CONOHA_API_PASSWORD` |
| ConoHa v3 | `conohav3` | `CONOHAV3_TENANT_ID`, `CONOHAV3_API_USER_ID`, `CONOHAV3_API_PASSWORD` |
| Constellix | `constellix` | `CONSTELLIX_API_KEY`, `CONSTELLIX_SECRET_KEY` |
| Core-Networks | `corenetworks` | `CORENETWORKS_LOGIN`, `CORENETWORKS_PASSWORD` |
| CPanel/WHM | `cpanel` | `CPANEL_USERNAME`, `CPANEL_TOKEN`, `CPANEL_BASE_URL` |
| Curanet | `curanet` | `CURANET_API_KEY` |
| Czechia | `czechia` | `CZECHIA_TOKEN` |
| DanDomain | `dandomain` | `DANDOMAIN_API_KEY` |
| DDnss (DynDNS Service) | `ddnss` | `DDNSS_KEY` |
| Derak Cloud | `derak` | `DERAK_API_KEY` |
| deSEC.io | `desec` | `DESEC_TOKEN` |
| Designate DNSaaS for Openstack | `designate` | `OS_AUTH_URL`, `OS_USERNAME`, `OS_PASSWORD`, `OS_USER_ID`, `OS_APPLICATION_CREDENTIAL_ID`, `OS_APPLICATION_CREDENTIAL_NAME`, `OS_APPLICATION_CREDENTIAL_SECRET`, `OS_PROJECT_NAME`, `OS_REGION_NAME` |
| Digital Ocean | `digitalocean` | `DO_AUTH_TOKEN` |
| Dinahosting | `dinahosting` | `DINAHOSTING_USERNAME`, `DINAHOSTING_PASSWORD` |
| DirectAdmin | `directadmin` | `DIRECTADMIN_API_URL`, `DIRECTADMIN_USERNAME`, `DIRECTADMIN_PASSWORD` |
| DNS Made Easy | `dnsmadeeasy` | `DNSMADEEASY_API_KEY`, `DNSMADEEASY_API_SECRET` |
| DNS Update (RFC2136) | `dnsupdate` | `DNSUPDATE_NAMESERVER` |
| dns.la | `dnsla` | `DNSLA_API_ID`, `DNSLA_API_SECRET` |
| DNS.services | `dnsservices` | `DNSSERVICES_USERNAME`, `DNSSERVICES_PASSWORD` |
| DNScale | `dnscale` | `DNSCALE_API_TOKEN` |
| DNSExit | `dnsexit` | `DNSEXIT_API_KEY` |
| dnsHome.de | `dnshomede` | `DNSHOMEDE_CREDENTIALS` |
| DNSimple | `dnsimple` | `DNSIMPLE_OAUTH_TOKEN` |
| DNSMint | `dnsmint` | `DNSMINT_API_KEY` |
| Domain Offensive (do.de) | `dode` | `DODE_TOKEN` |
| Domeneshop | `domeneshop` | `DOMENESHOP_API_TOKEN`, `DOMENESHOP_API_SECRET` |
| DreamHost | `dreamhost` | `DREAMHOST_API_KEY` |
| Duck DNS | `duckdns` | `DUCKDNS_TOKEN` |
| Dyn | `dyn` | `DYN_CUSTOMER_NAME`, `DYN_USER_NAME`, `DYN_PASSWORD` |
| Dynadot | `dynadot` | `DYNADOT_API_KEY`, `DYNADOT_API_SECRET` |
| DynDnsFree.de | `dyndnsfree` | `DYNDNSFREE_USERNAME`, `DYNDNSFREE_PASSWORD` |
| Dynu | `dynu` | `DYNU_API_KEY` |
| EasyDNS | `easydns` | `EASYDNS_TOKEN`, `EASYDNS_KEY` |
| EdgeCenter | `edgecenter` | `EDGECENTER_PERMANENT_API_TOKEN` |
| Efficient IP | `efficientip` | `EFFICIENTIP_USERNAME`, `EFFICIENTIP_PASSWORD`, `EFFICIENTIP_HOSTNAME`, `EFFICIENTIP_DNS_NAME` |
| Epik | `epik` | `EPIK_SIGNATURE` |
| EuroDNS | `eurodns` | `EURODNS_APP_ID`, `EURODNS_API_KEY` |
| EUserv | `euserv` | `EUSERV_EMAIL`, `EUSERV_PASSWORD`, `EUSERV_ORDER_ID` |
| Excedo | `excedo` | `EXCEDO_API_KEY`, `EXCEDO_API_URL` |
| Exoscale | `exoscale` | `EXOSCALE_API_KEY`, `EXOSCALE_API_SECRET` |
| External program | `exec` |  |
| F5 XC | `f5xc` | `F5XC_API_TOKEN`, `F5XC_TENANT_NAME`, `F5XC_GROUP_NAME` |
| FENO | `feno` | `FENO_API_KEY` |
| Fornex | `fornex` | `FORNEX_API_KEY` |
| freemyip.com | `freemyip` | `FREEMYIP_TOKEN` |
| FusionLayer NameSurfer | `namesurfer` | `NAMESURFER_BASE_URL`, `NAMESURFER_API_KEY`, `NAMESURFER_API_SECRET` |
| G-Core | `gcore` | `GCORE_PERMANENT_API_TOKEN` |
| Gandi | `gandi` | `GANDI_API_KEY` |
| Gandi Live DNS (v5) | `gandiv5` | `GANDIV5_PERSONAL_ACCESS_TOKEN`, `GANDIV5_API_KEY` |
| Gehirn | `gehirn` | `GEHIRN_TOKEN_ID`, `GEHIRN_TOKEN_SECRET` |
| Gigahost.no | `gigahostno` | `GIGAHOSTNO_USERNAME`, `GIGAHOSTNO_PASSWORD`, `GIGAHOSTNO_API_KEY` |
| Glesys | `glesys` | `GLESYS_API_USER`, `GLESYS_API_KEY` |
| Gname | `gname` | `GNAME_APP_ID`, `GNAME_APP_KEY` |
| Go Daddy | `godaddy` | `GODADDY_API_KEY`, `GODADDY_API_SECRET` |
| Google Cloud | `gcloud` | `GCE_PROJECT`, `GCE_SERVICE_ACCOUNT_FILE`, `GCE_SERVICE_ACCOUNT` |
| Gravity | `gravity` | `GRAVITY_SERVER_URL`, `GRAVITY_USERNAME`, `GRAVITY_PASSWORD` |
| Hetzner | `hetzner` | `HETZNER_API_TOKEN` |
| Hosting.de | `hostingde` | `HOSTINGDE_API_KEY` |
| Hosting.nl | `hostingnl` | `HOSTINGNL_API_KEY` |
| Hostinger | `hostinger` | `HOSTINGER_API_TOKEN` |
| Hosttech | `hosttech` | `HOSTTECH_API_KEY`, `HOSTTECH_PASSWORD` |
| HostUp | `hostup` | `HOSTUP_API_KEY` |
| HTTP request | `httpreq` | `HTTPREQ_MODE`, `HTTPREQ_ENDPOINT` |
| http.net | `httpnet` | `HTTPNET_API_KEY` |
| Huawei Cloud | `huaweicloud` | `HUAWEICLOUD_ACCESS_KEY_ID`, `HUAWEICLOUD_SECRET_ACCESS_KEY`, `HUAWEICLOUD_REGION` |
| Hurricane Electric DNS | `hurricane` | `HURRICANE_TOKENS` |
| HyperOne | `hyperone` |  |
| IBM Cloud (SoftLayer) | `ibmcloud` | `SOFTLAYER_USERNAME`, `SOFTLAYER_API_KEY` |
| IIJ DNS Platform Service | `iijdpf` | `IIJ_DPF_API_TOKEN`, `IIJ_DPF_DPM_SERVICE_CODE` |
| Infoblox | `infoblox` | `INFOBLOX_USERNAME`, `INFOBLOX_PASSWORD`, `INFOBLOX_HOST` |
| Infomaniak | `infomaniak` | `INFOMANIAK_ACCESS_TOKEN` |
| Internet.bs | `internetbs` | `INTERNET_BS_API_KEY`, `INTERNET_BS_PASSWORD` |
| INWX | `inwx` | `INWX_USERNAME`, `INWX_PASSWORD` |
| Ionos | `ionos` | `IONOS_API_KEY` |
| Ionos Cloud | `ionoscloud` | `IONOSCLOUD_API_TOKEN` |
| IPv64 | `ipv64` | `IPV64_API_KEY` |
| ISPConfig 3 | `ispconfig` | `ISPCONFIG_SERVER_URL`, `ISPCONFIG_USERNAME`, `ISPCONFIG_PASSWORD` |
| ISPConfig 3 - Dynamic DNS (DDNS) Module | `ispconfigddns` | `ISPCONFIG_DDNS_SERVER_URL`, `ISPCONFIG_DDNS_TOKEN` |
| JD Cloud | `jdcloud` | `JDCLOUD_ACCESS_KEY_ID`, `JDCLOUD_ACCESS_KEY_SECRET` |
| Joker | `joker` | `JOKER_API_MODE`, `JOKER_USERNAME`, `JOKER_PASSWORD`, `JOKER_API_KEY` |
| Joohoi's ACME-DNS | `acmedns` | `ACME_DNS_API_BASE`, `ACME_DNS_STORAGE_PATH`, `ACME_DNS_STORAGE_BASE_URL` |
| Katapult | `katapult` | `KATAPULT_API_KEY` |
| KeyHelp | `keyhelp` | `KEYHELP_BASE_URL`, `KEYHELP_API_KEY` |
| Leaseweb | `leaseweb` | `LEASEWEB_API_KEY` |
| Liara | `liara` | `LIARA_API_KEY` |
| Lima-City | `limacity` | `LIMACITY_API_KEY` |
| Linode (v4) | `linode` | `LINODE_TOKEN` |
| Liquid Web | `liquidweb` | `LWAPI_USERNAME`, `LWAPI_PASSWORD` |
| Loopia | `loopia` | `LOOPIA_API_USER`, `LOOPIA_API_PASSWORD` |
| LuaDNS | `luadns` | `LUADNS_API_USERNAME`, `LUADNS_API_TOKEN` |
| Mail-in-a-Box | `mailinabox` | `MAILINABOX_EMAIL`, `MAILINABOX_PASSWORD`, `MAILINABOX_BASE_URL` |
| ManageEngine CloudDNS | `manageengine` | `MANAGEENGINE_CLIENT_ID`, `MANAGEENGINE_CLIENT_SECRET` |
| Metaname | `metaname` | `METANAME_ACCOUNT_REFERENCE`, `METANAME_API_KEY` |
| Metaregistrar | `metaregistrar` | `METAREGISTRAR_API_TOKEN` |
| mijn.host | `mijnhost` | `MIJNHOST_API_KEY` |
| Mittwald | `mittwald` | `MITTWALD_TOKEN` |
| myaddr.{tools,dev,io} | `myaddr` | `MYADDR_PRIVATE_KEYS_MAPPING` |
| MyDNS.jp | `mydnsjp` | `MYDNSJP_MASTER_ID`, `MYDNSJP_PASSWORD` |
| Myra | `myra` | `MYRA_API_KEY`, `MYRA_API_SECRET` |
| MythicBeasts | `mythicbeasts` | `MYTHICBEASTS_USERNAME`, `MYTHICBEASTS_PASSWORD` |
| Name.com | `namedotcom` | `NAMECOM_USERNAME`, `NAMECOM_API_TOKEN` |
| Namecheap | `namecheap` | `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY` |
| Namesilo | `namesilo` | `NAMESILO_API_KEY` |
| NearlyFreeSpeech.NET | `nearlyfreespeech` | `NEARLYFREESPEECH_API_KEY`, `NEARLYFREESPEECH_LOGIN` |
| NederHost | `nederhost` | `NEDERHOST_API_KEY` |
| Neodigit | `neodigit` | `NEODIGIT_TOKEN` |
| Netcup | `netcup` | `NETCUP_CUSTOMER_NUMBER`, `NETCUP_API_KEY`, `NETCUP_API_PASSWORD` |
| Netlify | `netlify` | `NETLIFY_TOKEN` |
| Netnod | `netnod` | `NETNOD_TOKEN` |
| NexDNS | `nexdns` | `NEXDNS_API_TOKEN` |
| Ngenix | `ngenix` | `NGENIX_USERNAME`, `NGENIX_TOKEN`, `NGENIX_CUSTOMER_ID` |
| Nicmanager | `nicmanager` | `NICMANAGER_API_LOGIN`, `NICMANAGER_API_USERNAME`, `NICMANAGER_API_EMAIL`, `NICMANAGER_API_PASSWORD` |
| NIFCloud | `nifcloud` | `NIFCLOUD_ACCESS_KEY_ID`, `NIFCLOUD_SECRET_ACCESS_KEY` |
| Njalla | `njalla` | `NJALLA_TOKEN` |
| Nodion | `nodion` | `NODION_API_TOKEN` |
| NS1 | `ns1` | `NS1_API_KEY` |
| Octenium | `octenium` | `OCTENIUM_API_KEY` |
| omg.lol | `omglol` | `OMGLOL_API_KEY` |
| Online.net | `onlinenet` | `ONLINENET_API_TOKEN` |
| Open Telekom Cloud | `otc` | `OTC_USER_NAME`, `OTC_PASSWORD`, `OTC_PROJECT_NAME`, `OTC_DOMAIN_NAME` |
| Openprovider | `openprovider` | `OPENPROVIDER_USERNAME`, `OPENPROVIDER_PASSWORD` |
| OpusDNS | `opusdns` | `OPUSDNS_API_KEY` |
| Oracle Cloud | `oraclecloud` | `OCI_COMPARTMENT_OCID`, `OCI_REGION`, `OCI_PRIVATE_KEY_PATH`, `OCI_PRIVATE_KEY_PASSWORD`, `OCI_TENANCY_OCID`, `OCI_USER_OCID`, `OCI_FINGERPRINT` |
| OVH | `ovh` | `OVH_ENDPOINT`, `OVH_APPLICATION_KEY`, `OVH_APPLICATION_SECRET`, `OVH_CONSUMER_KEY`, `OVH_CLIENT_ID`, `OVH_CLIENT_SECRET`, `OVH_ACCESS_TOKEN` |
| plesk.com | `plesk` | `PLESK_SERVER_BASE_URL`, `PLESK_USERNAME`, `PLESK_PASSWORD` |
| PointDNS/PointHQ | `pointdns` | `POINTDNS_USERNAME`, `POINTDNS_PASSWORD` |
| Porkbun | `porkbun` | `PORKBUN_SECRET_API_KEY`, `PORKBUN_API_KEY` |
| Poweradmin | `poweradmin` | `POWERADMIN_BASE_URL`, `POWERADMIN_API_KEY` |
| PowerDNS | `pdns` | `PDNS_API_KEY`, `PDNS_API_URL` |
| Rackspace | `rackspace` | `RACKSPACE_USER`, `RACKSPACE_API_KEY` |
| Rage4 | `rage4` | `RAGE4_USERNAME`, `RAGE4_PASSWORD` |
| Rain Yun/雨云 | `rainyun` | `RAINYUN_API_KEY` |
| RcodeZero | `rcodezero` | `RCODEZERO_API_TOKEN` |
| reg.ru | `regru` | `REGRU_USERNAME`, `REGRU_PASSWORD` |
| Regfish | `regfish` | `REGFISH_API_KEY` |
| RimuHosting | `rimuhosting` | `RIMUHOSTING_API_KEY` |
| RU CENTER | `nicru` | `NICRU_USER`, `NICRU_PASSWORD`, `NICRU_SERVICE_ID`, `NICRU_SECRET` |
| Sakura Cloud | `sakuracloud` | `SAKURACLOUD_ACCESS_TOKEN`, `SAKURACLOUD_ACCESS_TOKEN_SECRET` |
| Scaleway | `scaleway` | `SCW_SECRET_KEY`, `SCW_PROJECT_ID` |
| ScanNet | `scannet` | `SCANNET_API_KEY` |
| Selectel | `selectel` | `SELECTEL_API_TOKEN` |
| Selectel v2 | `selectelv2` | `SELECTELV2_USERNAME`, `SELECTELV2_PASSWORD`, `SELECTELV2_ACCOUNT_ID`, `SELECTELV2_PROJECT_ID` |
| SelfHost.(de\|eu) | `selfhostde` | `SELFHOSTDE_USERNAME`, `SELFHOSTDE_PASSWORD`, `SELFHOSTDE_RECORDS_MAPPING` |
| Servercow | `servercow` | `SERVERCOW_USERNAME`, `SERVERCOW_PASSWORD` |
| Shellrent | `shellrent` | `SHELLRENT_USERNAME`, `SHELLRENT_TOKEN` |
| Simply.com | `simply` | `SIMPLY_ACCOUNT_NAME`, `SIMPLY_API_KEY` |
| Sonic | `sonic` | `SONIC_USER_ID`, `SONIC_API_KEY` |
| Spaceship | `spaceship` | `SPACESHIP_API_KEY`, `SPACESHIP_API_SECRET` |
| Stackpath (Deprecated) | `stackpath` | `STACKPATH_CLIENT_ID`, `STACKPATH_CLIENT_SECRET`, `STACKPATH_STACK_ID` |
| Syse | `syse` | `SYSE_CREDENTIALS` |
| Technitium | `technitium` | `TECHNITIUM_SERVER_BASE_URL`, `TECHNITIUM_API_TOKEN` |
| Tele3 | `tele3` | `TELE3_KEY`, `TELE3_SECRET` |
| Tencent Cloud DNS | `tencentcloud` | `TENCENTCLOUD_SECRET_ID`, `TENCENTCLOUD_SECRET_KEY` |
| Tencent EdgeOne | `edgeone` | `EDGEONE_SECRET_ID`, `EDGEONE_SECRET_KEY` |
| Timeweb Cloud | `timewebcloud` | `TIMEWEBCLOUD_AUTH_TOKEN` |
| TodayNIC/时代互联 | `todaynic` | `TODAYNIC_AUTH_USER_ID`, `TODAYNIC_API_KEY` |
| TransIP | `transip` | `TRANSIP_ACCOUNT_NAME`, `TRANSIP_PRIVATE_KEY_PATH` |
| UCloud | `ucloud` | `UCLOUD_PUBLIC_KEY`, `UCLOUD_PRIVATE_KEY` |
| Ultradns | `ultradns` | `ULTRADNS_USERNAME`, `ULTRADNS_PASSWORD` |
| United-Domains | `uniteddomains` | `UNITEDDOMAINS_API_KEY` |
| Variomedia | `variomedia` | `VARIOMEDIA_API_TOKEN` |
| Veesp | `veesp` | `VEESP_USERNAME`, `VEESP_PASSWORD` |
| VegaDNS | `vegadns` | `SECRET_VEGADNS_KEY`, `SECRET_VEGADNS_SECRET`, `VEGADNS_URL` |
| Vercel | `vercel` | `VERCEL_API_TOKEN` |
| Versio.[nl\|eu\|uk] | `versio` | `VERSIO_USERNAME`, `VERSIO_PASSWORD` |
| VinylDNS | `vinyldns` | `VINYLDNS_ACCESS_KEY`, `VINYLDNS_SECRET_KEY`, `VINYLDNS_HOST` |
| Virtualname | `virtualname` | `VIRTUALNAME_TOKEN` |
| VK Cloud | `vkcloud` | `VK_CLOUD_PROJECT_ID`, `VK_CLOUD_USERNAME`, `VK_CLOUD_PASSWORD` |
| Volcano Engine/火山引擎 | `volcengine` | `VOLC_ACCESSKEY`, `VOLC_SECRETKEY` |
| Vscale | `vscale` | `VSCALE_API_TOKEN` |
| Vultr | `vultr` | `VULTR_API_KEY` |
| Wannafind | `wannafind` | `WANNAFIND_API_KEY` |
| Webglobe | `webglobe` | `WEBGLOBE_LOGIN`, `WEBGLOBE_API_KEY` |
| webnames.ca | `webnamesca` | `WEBNAMESCA_API_USER`, `WEBNAMESCA_API_KEY` |
| webnames.ru | `webnamesru` | `WEBNAMESRU_API_KEY` |
| Websupport | `websupport` | `WEBSUPPORT_API_KEY`, `WEBSUPPORT_SECRET` |
| WEDOS | `wedos` | `WEDOS_USERNAME`, `WEDOS_WAPI_PASSWORD` |
| West.cn/西部数码 | `westcn` | `WESTCN_USERNAME`, `WESTCN_PASSWORD` |
| Xinnet | `xinnet` | `XINNET_SECRET`, `XINNET_AGENT_ID` |
| Yandex 360 | `yandex360` | `YANDEX360_OAUTH_TOKEN`, `YANDEX360_ORG_ID` |
| Yandex Cloud | `yandexcloud` | `YANDEX_CLOUD_IAM_TOKEN`, `YANDEX_CLOUD_FOLDER_ID` |
| Yandex PDD | `yandex` | `YANDEX_PDD_TOKEN` |
| Zilore | `zilore` | `ZILORE_ACCESS_KEY` |
| Zone.ee | `zoneee` | `ZONEEE_API_USER`, `ZONEEE_API_KEY` |
| ZoneEdit | `zoneedit` | `ZONEEDIT_USER`, `ZONEEDIT_AUTH_TOKEN` |
| Zonomi | `zonomi` | `ZONOMI_API_KEY` |
