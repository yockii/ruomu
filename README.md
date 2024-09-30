# ruomu
核心功能，用于快速应用开发，以【配置表单->生成代码->编译可执行程序】的方式完成应用开发，并支持独立程序部署。

## 使用
目前已完成若木主程序（微核），可独立部署，以插件方式接入。
插件已完成：用户中心、界面中心。

需要数据库（可以用sqlite、mysql、pgsql）、redis（推荐直接docker启动个）环境。

在[release](https://github.com/yockii/ruomu/releases)中下载对应的版本。

将ruomu程序放在某文件夹下，同级文件夹下，创建plugins文件夹，将插件放入plugins文件夹下；
配置文件在ruomu程序同级目录下的conf文件夹下的config.toml（新建，参考以下配置信息）：
```toml
modulename = 'ruomu'
usertokenexpire = 86400

[database]
db = 'ruomu'
#driver = 'mysql'
driver = 'sqlite'
#host = '127.0.0.1'
host = 'ruomu.db'
#password = 'root'
#port = 3306
prefix = 't_'
#showsql = true
#user = 'root'

[logger]
backups = 7
compress = false
dir = 'logs'
level = 'debug'
maxage = 30
maxsize = 100

[project]
id = 28010609669849088 # 这个id是界面中心作为界面主项目的id，在执行插件初始化后自动写入

[redis]
app = 'ruomu'
host = '127.0.0.1'
password = '123456' # 无密码可留空
port = 6379

[server]
port = 8888 # 提供服务的端口

```

插件初始化：

插件能够自动建表和预置数据，需要在ruomu文件夹下执行
```shell
# linux下：
./plugins/ruomu-uc
./plugins/ruomu-ui
# windows下：
./plugins/ruomu-uc.exe
./plugins/ruomu-ui.exe
```
执行完毕后，将views、public文件夹放到ruomu同级文件夹中，即可运行ruomu主程序。
```shell
# linux下：
./ruomu
# windows下：
./ruomu.exe
```

## 插件下载地址
[用户中心](https://github.com/yockii/ruomu-uc/releases)

[界面中心](https://github.com/yockii/ruomu-ui/releases)



## 功能
- [ ] 用户、角色、权限管理
- [ ] 多租户管理
- [ ] 项目管理
- [ ] 应用管理
- [ ] 模型配置(数据库模型)
- [ ] 界面配置(表单、列表页面)
- [ ] 逻辑配置(复杂业务逻辑处理)
- [ ] 代码生成
- [ ] 应用权限生成
- [ ] 自动编译
- [ ] 可部署程序生成

## 模块
- [x] core: https://github.com/yockii/ruomu-core
- [x] 模块管理: https://github.com/yockii/ruomu-module
- [x] 用户管理：https://github.com/yockii/ruomu-uc
- [x] 界面管理：https://github.com/yockii/ruomu-ui
- [ ] 前端默认主题：开发中……

## 开发
开发插件可以使用任意语言，但需以微核core提供的proto`shared/communicate.proto`作为通信协议，可通过protobuf生成语言代码。

go语言可参考ruomu-uc/ruomu-ui,引入core微核进行直接开发。

### GO debug模式
1. 编译插件时，需使用`go build -gcflags="-N -l"`
2. 创建debug脚本，如：ruomu-ui.sh，内如参考如下
3. 安装dlv后，将插件启动命令修改为 `/bin/sh ./plugins/xxxx.sh [--其他参数]`
4. ide中启动debug模式，选择`Remote`，端口为sh中配置的端口

ruomu-ui.sh:
```shell
export TEST_PLUGIN=cookie_value
#set plugin vars
export PLUGIN_MIN_PORT=10000
export PLUGIN_MAX_PORT=25000
export PLUGIN_PROTOCOL_VERSIONS=1

#make sure plugin output is "original" without debugger messages by passing log-dest & tty arguments
dlv --listen=:40000 --headless=true --api-version=2 --accept-multiclient \
  --log-dest "dlv.log"  \
  --tty="" \
    exec ~/Projects/github.com/yockii/ruomu/plugins/ruomu-ui -- "$@"
```
注：启动器启动插件时会阻塞等待debug附加，因此出现插件启动日志后，需启动remote debug，否则不会继续运行。