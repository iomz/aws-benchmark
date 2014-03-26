cloud-bench
=================

Benchmark scripts for video processing performance measurement

Features
----
* Deploy instances on several cloud stacks with pre-compiled benchmark scripts (Unixbench + x264)
* Aggregate the results and plot them in HTML5

Preparation for AWS
----
    $ pip install boto
    $ echo "[Credentials]\naws_access_key_id = <your aws access key id>\naws_secret_access_key = <your aws secret key>" > ~/.boto
    $ git clone https://github.com/iomz/cloud-bench.git
    $ cd cloud-bench && ./generate_json.py update -f
    
Preparation for Rackspace
----

Preparation for Cisco Cloud
----

Start UnixBench
----
    $ ./run_ec2_benchmark.py unixbench && ./generate_json.py unixbench

Start x264
----
    $ ./run_ec2_benchmark.py x264 $$ ./generate_json.py rank

TODOs
----
* Launch scripts
    * Automated configuration setup (Interactive?)
    * Argument parsing in unixbench/upload_log.py
    * Aggrigate the run script and json generator

* Result data
    * Simplify data retrieval and store

* Documentation
    * Usage
