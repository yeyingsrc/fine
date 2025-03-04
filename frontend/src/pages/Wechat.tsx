import React, { useEffect, useRef, useState } from 'react';
import {
    Button,
    ConfigProvider,
    Flex,
    Input,
    List,
    Popconfirm,
    Popover,
    Space,
    Splitter,
    Tag,
    Tooltip
} from 'antd';
import { FileTextOutlined, FileZipOutlined, FolderOpenOutlined } from "@ant-design/icons";
import TextArea from "antd/es/input/TextArea";
import "@/pages/Wechat.css"
import { EventsOn } from "../../wailsjs/runtime";
import {config, event, wechat} from "../../wailsjs/go/models";
import { errorNotification } from "@/component/Notification";
import {
    AutoDecompile,
    ClearApplet,
    ClearDecompiled,
    Decompile,
    GetMatchedString, SaveWechatRules,
} from "../../wailsjs/go/wechat/Bridge";
import { DecompileIcon } from "@/component/Icon";
import InfoToFront = wechat.InfoToFront;
import { useDispatch, useSelector } from "react-redux";
import { appActions, RootState } from "@/store/store";
import {Join} from "../../wailsjs/go/osoperation/Path";
import {OpenDirectoryDialog, OpenFolder} from "../../wailsjs/go/osoperation/Runtime";
import {GetWechatRules, SaveWechat} from "../../wailsjs/go/application/Application";
import {copy} from "@/util/util";
import VersionTaskStatus = wechat.VersionTaskStatus;

export const MiniProgram: React.FC = () => {
    const [data, setData] = useState<InfoToFront[]>([])
    const [select, setSelect] = useState<{ appid: string, version: string, nickname: string }>()
    const [matchedResult, setMatchedResult] = useState<string>("")
    const appIdRef = useRef<string>("")
    const versionRef = useRef<string>("")
    const [appletPath, setAppletPath] = useState<string>("")
    const dataCachePath = useRef<string>("")
    const [autoDecompile, setAutoDecompile] = useState<boolean>(false)
    const [isClearing, setIsClearing] = useState<boolean>(false)
    const [open, setOpen] = useState<boolean>(false)
    const [rules, setRules] = useState<string>("")
    const dispatch = useDispatch()
    const cfg = useSelector((state: RootState) => state.app.global.config || new config.Config())
    const event = useSelector((state: RootState) => state.app.global.event)
    const status = useSelector((state: RootState) => state.app.global.status)

    useEffect(() => {
        EventsOn(event.DecompileWxMiniProgram, (eventDetail:event.EventDetail) => {
            console.log(eventDetail)
            if (eventDetail.Status === status.Running || eventDetail.Status === status.Stopped){
                const index = data.findIndex((item:InfoToFront) => item.AppID === eventDetail.Data.AppID);
                if (index!== -1) {
                    const index2 = data[index].Versions.findIndex((item:VersionTaskStatus) => item.Number === eventDetail.Data.Version);
                    if (index2 !== -1) {
                        data[index].Versions[index2].Message = eventDetail.Message;
                    }
                }
                if (eventDetail.Status === status.Stopped){
                    if (eventDetail.Data.Appid !== appIdRef.current || eventDetail.Data.Version !== versionRef.current) {
                        return
                    }
                    GetMatchedString(eventDetail.Data.AppID, eventDetail.Data.Version)
                        .then(r => {
                            setMatchedResult(r?.join("\n"))
                        })
                }
            } else if (eventDetail.Status === status.Error){
                const index = data.findIndex((item:InfoToFront) => item.AppID === eventDetail.Data.AppID);
                if (index!== -1) {
                    const index2 = data[index].Versions.findIndex((item:VersionTaskStatus) => item.Number === eventDetail.Data.Version);
                    if (index2 !== -1) {
                        data[index].Versions[index2].Message = eventDetail.Error;
                    }
                }
            }
        })

        EventsOn(event.DecompileWxMiniProgramTicker, (eventDetail:event.EventDetail) => {
            setData(eventDetail.Data)
        })
    }, []);

    useEffect(() => {
        setAppletPath(cfg.Wechat.Applet)
        setRules(cfg.Wechat.Rules.join("\n"))
        dataCachePath.current = cfg.WechatDataDir
    }, [cfg.Wechat, cfg.WechatDataDir])

    const saveRules = (rules: string[]) => {
        SaveWechatRules(rules).then(
            () => {
                setOpen(false)
            }
        ).catch(
            e => {
                errorNotification("错误", e)
            }
        )
    }

    const configAppletPath = () => {
        OpenDirectoryDialog().then(
            result => {
                if (result) {
                    const t = { ...cfg.Wechat, Applet: result }
                    SaveWechat(t).then(
                        () => {
                            const tt = { ...cfg, Wechat: { ...t } } as config.Config
                            dispatch(appActions.setConfig(tt))
                        }
                    ).catch(
                        e => {
                            errorNotification("错误", e)
                            setAppletPath(cfg.Wechat.Applet)
                        }
                    )
                }
            }
        )
    }

    const getApis=()=>{
        const regex: RegExp = /\/(?:[\w-]+\/)*[\w-]+(.cgi|.php|.action|.jsp|.jspx|.asp|.aspx|.py|.rb|.html|.htm|.tpl|.do|.jsf)?\/*\??(?:[\w=&-]+)?\)*/gi
        const matches = matchedResult.matchAll(regex);
        const items:string[] = []
        for (const match of matches) {
            items.push(match[0])
        }
        if (items.length === 0 ){
            return
        }
        copy(Array.from(new Set(items)).join("\n"))
    }

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: "column",
                // padding: "0 10px",
                height: '100%'
            }}
        >

            <Flex vertical gap={10} align={"center"} justify={"center"}>
                <Space.Compact style={{ justifyContent: "center" }}>
                    <Input style={{ width: "600px", }} size={'small'} prefix={<>微信Applet路径</>} value={appletPath} />
                    <Button size={"small"} onClick={configAppletPath} >选择</Button>
                    {
                        autoDecompile ?
                            < Button size={"small"} onClick={() => {
                                setAutoDecompile(false)
                                AutoDecompile(false)
                            }} style={{ backgroundColor: "red", color: "white" }}>停用自动反编译</Button>
                            :
                            < Button size={"small"} type={'primary'} onClick={() => {
                                setAutoDecompile(true)
                                AutoDecompile(true)
                            }} >启用自动反编译</Button>
                    }
                    <Popconfirm
                        placement="bottom"
                        title={"删除"}
                        description={<>确认删除Applet目录下的所有文件吗?<br />
                            (会同时删除反编译后的所有文件)</>}
                        okText="Yes"
                        cancelText="No"
                        onConfirm={() => {
                            setIsClearing(true)
                            ClearApplet().then(() => {
                                // setTreeData([])
                            }).catch(
                                err => errorNotification("错误", err)
                            ).finally(
                                () => {
                                    setIsClearing(false)
                                }
                            )
                        }}
                    >
                        <Button size={"small"}>清空Applet目录</Button>
                    </Popconfirm>
                    <Popconfirm
                        placement="bottom"
                        title={"删除"}
                        description={"确认删除所有反编译后的文件吗?"}
                        okText="Yes"
                        cancelText="No"
                        onConfirm={() => {
                            setIsClearing(true)
                            ClearDecompiled().catch(
                                err => errorNotification("错误", err)
                            ).then(() => {
                                // setTreeData([])
                            }).finally(
                                () => setIsClearing(false)
                            )
                        }}
                    >
                        <Button size={"small"}>清空反编译后的文件</Button>
                    </Popconfirm>
                    <Popover
                        content={<Flex vertical={true} gap={5}>
                            <Flex gap={5}>
                                <Button size={"small"} type={"primary"} onClick={() => {
                                    saveRules(rules.split("\n"))
                                }}>保存</Button>
                                <Button size={"small"} type={"primary"} onClick={() => {
                                    setOpen(false)
                                }}>取消</Button>
                                <Tag bordered={false} color="cyan">
                                    正则测试地址: https://regex101.com/
                                </Tag>
                            </Flex>
                            <TextArea
                                value={rules}
                                wrap={"off"}
                                placeholder={"每行一条"}
                                style={{ width: "600px" }}
                                autoSize={{ minRows: 10, maxRows: 10 }}
                                onChange={e => setRules(e.target.value)}
                                allowClear
                            />
                        </Flex>}
                        trigger={"click"}
                        destroyTooltipOnHide
                        open={open}
                        onOpenChange={(v) => {
                            if (v) {
                                GetWechatRules()
                                    .then(
                                        r=>setRules(r.join("\n"))
                                    )
                            } else {
                                setRules("")
                            }
                            setOpen(v)
                        }}
                    >
                        <Button size={"small"}>信息提取规则</Button>
                    </Popover>
                </Space.Compact>
                建议先执行清空Applet目录以避免无法回溯是哪个小程序
            </Flex>
            <Splitter style={{
                flex: 1,overflow:"auto",padding: '5px'
            }}>
                <Splitter.Panel min={'15%'} defaultSize={"35%"}>
                    <ConfigProvider theme={{
                        components: {
                            List: {
                                titleMarginBottom: 5,
                                metaMarginBottom: 0
                            }
                        }
                    }}>
                        <List
                            style={{height: '100%',overflow:"auto"}}
                            // style={{overflowY: "auto", height: "calc(100vh -400px)", width: "100%"}}
                            itemLayout="vertical"
                            dataSource={data}
                            renderItem={(item) => {
                                return <List.Item key={item.AppID}
                                >
                                    <Flex vertical gap={5}>
                                        <Flex gap={5}>
                                            <Tag color={"cyan"} bordered={false}>
                                                <span style={{ fontWeight: "bold" }}>
                                                    {item.AppID}
                                                </span>
                                            </Tag>
                                            <Tag color={"orange"} bordered={false}>
                                                <span style={{ fontWeight: "bold" }}>
                                                    {item.UpdateDate}
                                                </span>
                                            </Tag>

                                        </Flex>
                                        <Flex vertical gap={5}>
                                            <Flex>
                                                {
                                                    item.Info?.Nickname && <> <Flex><Tag
                                                        title={item.Info.Nickname}
                                                        bordered={false}
                                                        color="red"
                                                        style={{
                                                            whiteSpace: "nowrap",
                                                            textOverflow: "ellipsis",
                                                            overflow: "hidden"
                                                        }}>{item.Info.Nickname}</Tag></Flex></>
                                                }
                                                {
                                                    item.Info?.Username && <>
                                                        <Tag bordered={false} color="cyan">{item.Info.Username}</Tag>
                                                    </>
                                                }
                                            </Flex>
                                            {
                                                item.Versions?.map((i) => {
                                                    return <Flex gap={5} key={`${item.AppID}-${i.Number}`} align={"center"}>
                                                        <Tag bordered={false} color={i.DecompileStatus === status.Stopped ? "#096dd9" : "#595959"}>
                                                            <FileZipOutlined  />{i.Number}
                                                        </Tag>
                                                        <Space.Compact size={"small"}>
                                                            <Tooltip title={"反编译"}>
                                                                <Button
                                                                    disabled={i.DecompileStatus === status.Running || i.MatchStatus === status.Running}
                                                                    icon={<DecompileIcon spin={i.DecompileStatus === status.Running}
                                                                    style={{ fontSize: "12px" }} />}
                                                                    onClick={() => {
                                                                        Decompile(new wechat.InfoToFront({
                                                                            AppID: item.AppID,
                                                                            Versions: item.Versions
                                                                        }))

                                                                    }}
                                                                />
                                                            </Tooltip>
                                                            <Tooltip title={"打开数据文件夹"}>
                                                                <Button
                                                                    disabled={i.DecompileStatus !== status.Stopped}
                                                                    icon={<FolderOpenOutlined />}
                                                                    onClick={
                                                                        async () => {
                                                                            OpenFolder(await Join([dataCachePath.current, item.AppID, i.Number]))
                                                                        }
                                                                    } />
                                                            </Tooltip>
                                                            <Tooltip title={"敏感信息"}>
                                                                <Button
                                                                    disabled={i.MatchStatus !== status.Stopped }
                                                                    icon={<FileTextOutlined />}
                                                                    onClick={
                                                                        async () => {
                                                                            setSelect({
                                                                                appid: item.AppID,
                                                                                version: i.Number,
                                                                                nickname: item.Info?.Nickname || ""
                                                                            })
                                                                            GetMatchedString(item.AppID, i.Number).then(
                                                                                r => {
                                                                                    setMatchedResult(r?.join("\n"))
                                                                                }
                                                                            )
                                                                        }
                                                                    } />
                                                            </Tooltip>
                                                        </Space.Compact>
                                                        {
                                                            i.Message && <span style={{color: '#8c8c8c', fontSize: '12px'}}>
                                                                {i.Message}
                                                            </span>
                                                        }
                                                    </Flex>
                                                })
                                            }
                                            <span style={{ color: "gray", fontSize: "12px" }}>
                                                {item.Info?.Description}
                                            </span>
                                        </Flex>
                                    </Flex>
                                </List.Item>
                            }}
                        />
                    </ConfigProvider>
                </Splitter.Panel>
                <Splitter.Panel min={'15%'} >
                    <Flex vertical gap={5} style={{ height: "100%" }}>
                        <Flex>
                            {
                                select?.appid && <Flex>
                                    <Tag bordered={false}
                                         color={"orange"}>{select?.appid} {select?.version}</Tag>
                                </Flex>
                            }
                            {
                                select?.nickname && <Flex>
                                    <Tag bordered={false} color={"orange"}>{select.nickname}</Tag>
                                </Flex>
                            }
                            <Button size={"small"} type={"primary"} onClick={getApis}>提取API</Button>
                        </Flex>

                        <TextArea
                            value={matchedResult}
                            onChange={(e) => setMatchedResult(e.target.value)}
                            style={{ height: "100%" }}
                            wrap="off"
                            allowClear
                        />
                    </Flex>
                </Splitter.Panel>
            </Splitter>
        </div>
    );
};