import sys
import pyrax
import socket
import time
import logging

pyrax.settings.set('identity_type', 'rackspace')
pyrax.set_credentials('aghcanuck', '50149f8f60b14340a36e24f4239a583e')
cs = pyrax.cloudservers
cf = pyrax.connect_to_cloudfiles("ORD")
logging.basicConfig(filename='upload.log', level=logging.INFO)

# Get the instance type
file = open('/var/local/instance_name', 'r')
instancetype= file.read()

#Create a container

try:
 cont = cf.create_container("Test2_" + str(instancetype))
except:
 logging.info('Error creating the container') 
print "Container: " + str(cont.name) + " created"
print "Uploading Results..."

#Uploading Results

try:
 pth2= "/root/x264bench/logs"
 upload_key, total_bytes =cf.upload_folder(pth2,cont)
except:
 logging.info('Error uploading')
print "Done"

#Following part is only applicable to rackspace Servers
print "Now deleting the server(only Rackspace)"

servername=instancetype

for server in cs.servers.list():
        if server.name.strip() == servername.strip():
                
                try:
                        server.delete()
			print "Server Deleted successfully"
                except:
                        logging.info('error deleting server' + str(server.name))

