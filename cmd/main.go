package main

import (
	"github.com/panjf2000/ants/v2"
	logger "github.com/sirupsen/logrus"
	"github.com/yockii/ruomu-core/config"
	"github.com/yockii/ruomu-core/server"
	"github.com/yockii/ruomu-module"

	"github.com/yockii/ruomu-core/database"

	_ "github.com/yockii/ruomu/internal/initial"
)

func main() {
	defer ants.Release()

	config.InitialLogger()

	database.Initial()
	defer database.Close()

	logger.Infoln("微核初始化完成")

	logger.Infoln("开始加载模块....")
	logger.Infoln("加载模块管理")
	ruomu_module.Initial()
	logger.Infoln("模块管理加载完毕")

	server.Static("./public")
	for {
		err := server.Start()
		if err != nil {
			logger.Errorln(err)
		}
	}
}
