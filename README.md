ec2-vid-benchmark
=================

Benchmark script of AWS EC2 instances for video processing performance

Features
----
* Perform UnixBench on all the EC2 insctances
* Parse and store the results into DynamoDB
* Plot the results in HTML5

Prepare
----
    $ pip install boto
    $ echo "[Credentials]\naws_access_key_id = <your aws access key id>\naws_secret_access_key = <your aws secret key>" > ~/.boto
    $ git clone https://github.com/iomz/ec2-vid-benchmark.git
    $ cd ec2-vid-benchmark
    $ ./update_instances.py

Start UnixBench
----
    $ ./run_ec2_benchmark.py unixbench && ./generate_json.py unixbench

Start x264
----
    $ ./run_ec2_benchmark.py x264

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
