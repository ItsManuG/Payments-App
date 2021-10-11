<!-- PROJECT API -->
<br />
<p align="center">
  <h3 align="center">Servicio Validador Contenedores Parquet </h3>
</p>

<!-- TABLE OF CONTENTS -->
<details open="open">
	<summary><b>Tabla de contenidos</b></summary>
	<ol>
		<li>Build Image</li>
		<li>Archivo de configuración</li>
		<li>Manifiesto AKS</li>
		<li>Servicio AKS</li>
		<li>Resultados</li>
	</ol>
</details>

# Build Image
Primero se deberá construir la imagen, para esto es necesario tener una cuenta en DockerHub. Para construir la imagen, nos posicionaremos en la carpeta en donde está el archivo Dockerfile. Para construir la imagen se ejecuta el siguiente comando.
```shell
docker build -t nombreCuentaDockerhub/nombreImagen:tagName .
```
Así se deberá de construir la imagen. Lo siguiente es subir la imagen construida a DockerHub, dentro de esta carpeta, se debe de ejecutar el siguiente comando
```shell
docker push nombreCuentaDockerhub/nombreImagen:tagName
```

# Archivo de configuración
El archivo de configuración se aloja en Azure, este se almacena en un *fileshare*. Este archivo esta en formato *py*.  
```python
import datetime
import os

# Keys to read Input 
account = os.getenv("ACCOUNT_NAME_INPUT") 
account_key = os.getenv("ACCOUNT_KEY_INPUT") 
domain = "@{}.blob.core.windows.net".format(account)
account_name = "https://{}.blob.core.windows.net".format(account)

# petition keys
PETITION_DATA_KEYS = [
    'container', 
    'input', 
    'cols_needed_init', 
    'cols_needed_end', 
    'parquets_needed_init', 
    'parquets_needed_end'
]

# Output
date = datetime.datetime.strftime(datetime.datetime.now(), "%Y%m%d")
time = datetime.datetime.strftime(datetime.datetime.now(), "%H-%M-%S")

ACCOUNT_NAME_OUTPUT = os.getenv("ACCOUNT_NAME_OUTPUT") 
ACCOUNT_KEY_OUTPUT = os.getenv("ACCOUNT_KEY_OUTPUT") 

STORAGE_CONTAINER_OUTPUT = "validacion-contenedores"

STORAGE_CONTAINER_PATH_VER_CONT = "date={}/validador_contenedores".format(date) 
STORAGE_CONTAINER_PATH_NAME_VER_CONT = "validador_contenedores_{}".format(time)

STORAGE_CONTAINER_PATH_EXT_COLS = "date={}/extractor_columnas".format(date)
STORAGE_CONTAINER_PATH_NAME_EXT_COLS = "extractor_columnas_{}".format(time)

STORAGE_CONTAINER_PATH_MAT_COLS = "date={}/match_columnas".format(date)
STORAGE_CONTAINER_PATH_NAME_MAT_COLS = "match_columnas_{}".format(time)

STORAGE_CONTAINER_PATH_ANA_PARQ = "date={}/analizador_parquet".format(date)
STORAGE_CONTAINER_PATH_NAME_ANA_PARQ = "analizador_parquet_{}".format(time)
```
Se dejó en formato *py* para que se pueda ejecutar algunas instrucciones sin necesidad de agregarlo directamente a la API, como se puede observar, se deja un apartado date, el cual al tener este archivo de configuración en Python, este solo toma la información generada por este proceso. Se pensó así por practicidad.

# Manifiesto AKS
Los manifiestos para este despliegue son 2:
- ***secrets_validador_contenedor.yaml:*** Este primer manifiesto, contiene el nombre nombres de la cuenta de entrada, salida, y nombre de la cuenta para acceso a Azure (archivo de configuración) también cuenta con las llaves para cada una de las cuentas mencionadas.
- ***kubernetes_validador_contenedores.yaml:*** Este manifiesto sirve para realizar el deploy en aks, aquí se configura de donde se tomará la imagen, el puerto al cual se expondrá la imagen, el nombre de las cuentas y como se tomaran para que se lean del archivo “secrets”. Hay que tener en cuenta un par de puntos a configurar dentro de este archivo. 
	- Configurar *fileshare*: 
		- *name:* Nombre del archivo de configuración en *fileshare*
		- *secretName:* Nombre del archivo *secrets*, este archivo se leerá para leer las llaves de acceso a Azure.
		- *shareName:* Nombre del *fileshare*
	- *image:* Imagen a descargar de Docker.

```yaml
spec:
      volumes:
      - name: config-validador-contenedores
        azureFile:
          secretName: secrets-validador-contenedores
          shareName: validador-contenedores
          readOnly: false
      containers:
        - name: api-validador-contenedores
          image: egarclan06/validador_contenedores:v6
          ports: 
          - containerPort: 4000
```

Dentro de este mismo manifiesto, se deberá de modificar el servicio:
- *name:* Se le asigna un nombre al servicio que estará en AKS.
- *loadBalancerIP:* Se asigna la dirección IP de este servicio.

```yaml
apiVersion: v1
kind: Service
metadata:
  #annotations:
    #service.beta.kubernetes.io/azure-load-balancer-internal: "true"
  name: api-validador-contenedores
spec:
  loadBalancerIP: 10.240.0.6
  type: LoadBalancer
  selector:
    app: api-validador-contenedores
  ports:
  - protocol: TCP
    port: 4000
    targetPort: 4000
```

# Servicio AKS
Una vez que se configuró cada uno de los manifiestos necesarios para el AKS. Se deberá de levantar el servicio con los siguientes comandos:
```shell
kubectl.exe apply -f .\secrets_validador_contenedor.yaml  
kubectl.exe apply -f .\kubernetes_validador_contenedores.yaml
```
Si revisamos el log de este servicio, veremos que se ha levantado correctamente, y que estará en espera para recibir una petición:

     * Serving Flask app 'main' (lazy loading)
     * Environment: production
       WARNING: This is a development server. Do not use it in a production deployment.
       Use a production WSGI server instead.
     * Debug mode: off
     * Running on all addresses.
       WARNING: This is a development server. Do not use it in a production deployment.
     * Running on http://172.17.0.5:4000/ (Press CTRL+C to quit)

# Input
Ahora que nuestro servicio está arriba se puede enviar input de entrada. El formato y la dirección es la siguiente:
```sh
  curl http://localhost:port/validador_contendores/input
```
```json
{
    "input_data": [
        {
            "container": "mex-landing-iba-chu-mc3-tm-coilbox", 
            "input": {
                "focus_on": ["20210801"], 
                "constrains": "None", 
                "total_files": "True"
            },
            "cols_needed_init": "0", 
            "cols_needed_end": "10",
            "parquets_needed_init": "0",
            "parquets_needed_end": "5"
        }
    ]
}
```
# Resultados
La API responderá, y el proceso se ejecutará en el AKS, para poder ver el proceso, hay que ver el “log” del AKS:
```json
{
	"code": "OK",
	"message": "Input se a enviado exitosamente, revisar logs de AKS para ver el proceso de este input..."
}
```
    172.17.0.1 - - [07/Oct/2021 16:56:37] "GET / HTTP/1.1" 404 -
    172.17.0.1 - - [07/Oct/2021 16:56:39] "GET /favicon.ico HTTP/1.1" 404 -
    172.17.0.1 - - [07/Oct/2021 16:56:51] "POST /validador_contendores/input HTTP/1.1" 200 -
    Address of self = <connector.connector_azure.connector_azure object at 0x7f048229fb50>File log in: <_io.TextIOWrapper name='<stdout>' mode='w' encoding='UTF-8'>
    Address of self = <connector.connector_azure.connector_azure object at 0x7f048229fb50>File log in: <_io.TextIOWrapper name='<stdout>' mode='w' encoding='UTF-8'>
    Azure Blob Storage V= 12.6.0 - Python quickstart sample 
    
    Listing blobs... 
    
    
    [00:00, ?it/s]
    [00:11, 11.26s/it]
    [00:11, 400.76it/s]
    Llaves de files_blob: dict_keys(['total_files', 'constrains', 'focus_on', 'duplicated'])
    21/10/07 16:57:42 WARN NativeCodeLoader: Unable to load native-hadoop library for your platform... using builtin-java classes where applicable
    Using Spark's default log4j profile: org/apache/spark/log4j-defaults.properties
    Setting default log level to "WARN".
    To adjust logging level use sc.setLogLevel(newLevel). For SparkR, use setLogLevel(newLevel).

# Responsables
- [Emanuel Garcia Landaverde] - emanuel.garcia.landaverde@everis.nttdata.com

