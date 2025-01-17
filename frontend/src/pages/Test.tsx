import {Button, Flex, Tag} from "antd";
import React, {CSSProperties, useEffect, useImperativeHandle, useMemo, useState} from "react";
import {fofa} from "../../wailsjs/go/models";
import HostAggsResult = fofa.HostAggsResult;
import {HostAggs} from "../../wailsjs/go/fofa/Bridge";
import {errorNotification} from "@/component/Notification";
import {AgGridReact} from "ag-grid-react";
import NotFound from "@/component/Notfound";
import Loading from "@/component/Loading";
import {
    ColDef,
    ICellRendererParams,
    IClipboardCopyParams,
    IClipboardCopyRowsParams, ProcessCellForExportParams,
    SideBarDef
} from "ag-grid-community";
import {WithIndex} from "@/component/Interface";
import Port = fofa.Port;
import Product = fofa.Product;
import Aiqicha from "@/pages/Aiqicha";

const SpanCssProperties:CSSProperties={
    display: "inline-block",
}

const LabelCssProperties:CSSProperties={
    minWidth: "100px",
    display: "inline-block"
}

type PageDataType = WithIndex<Port>

const FofaHostAggs:React.FC = React.forwardRef((props, ref)=>{
    const [pageData, setPageData] = useState<PageDataType[]>()
    const [uniqueProtocol, setUniqueProtocol] = useState<string[]>()
    const [ports, setPorts] = useState<number[]>()
    const [countryName, setCountryname] = useState<string>("")
    const [countryCode, setCountryCode] = useState<string>("")
    const [org, setOrg] = useState<string>("")
    const [asn, setAsn] = useState<number>()
    const [updateTime, setUpdateTime] = useState<string>("")
    const [domain, setDomain] = useState<string[]>([])

    useImperativeHandle(ref,()=>({
        query: (host: string) => 1,
    }))

    useEffect(()=>{
        query("119.8.45.177")
    },[])

    const query = (host:string)=>{
        setLoading(true)
        HostAggs(host)
            .then(r=>{

                const t:string[] = []
                const tt:number[] = []
                r.ports.forEach(port=>{
                    t.push(port.protocol)
                    tt.push(port.port)
                })
                setUniqueProtocol(Array.from(new Set(t)))
                setPorts(tt)
                const ttt = r.ports.map((i, index)=>{
                    return {index:index+1, ...i} as PageDataType
                }) as PageDataType[]
                setPageData(ttt)
                setDomain(r.domain)
                setAsn(r.asn)
                setCountryname(r.country_name)
                setCountryCode(r.country_code)
                setUpdateTime(r.update_time)
                setOrg(r.org)
            })
            .catch(e=>{
                errorNotification("错误", e)
            })
            .finally(()=>setLoading(false))
    }
    const [loading, setLoading] = useState<boolean>(false)
    const [columnDefs] = useState<ColDef[]>([
        {headerName:"序号", field: 'index', width: 80},
        {headerName:"端口", field: 'port', width: 120},
        {headerName:"协议", field: 'protocol', width: 120},
        {headerName:"更新时间", field: 'update_time', width: 200},
        {headerName:"产品", field: 'products', cellRenderer:(params:ICellRendererParams)=>{
            return <>
                {params.value?.map((i: Product, index: number) => {
                return <Tag key={index} bordered={false} color="cyan">
                    {i.product}
                </Tag>
            })}
            </>
        }, flex: 1},
    ])
    const defaultSideBarDef = useMemo<SideBarDef>(() => {
        return {
            toolPanels: [
                {
                    id: "columns",
                    labelDefault: "表格字段",
                    labelKey: "columns",
                    iconKey: "columns",
                    toolPanel: "agColumnsToolPanel",
                    toolPanelParams: {
                        suppressRowGroups: false,
                        suppressValues: false,
                        suppressPivots: true,
                        suppressPivotMode: true,
                        suppressColumnFilter: false,
                        suppressColumnSelectAll: true,
                        suppressColumnExpandAll: true,
                    },
                },
            ],
        }
    }, [])
    const defaultColDef = useMemo<ColDef>(() => {
        return {
            // allow every column to be aggregated
            enableValue: true,
            // allow every column to be grouped
            enableRowGroup: true,
            // allow every column to be pivoted
            enablePivot: true,
            filter: true,
            suppressHeaderMenuButton: true,
            suppressHeaderFilterButton: true,
        }
    }, [pageData])
    return <Flex vertical gap={10} align={"center"} style={{height: '100%', width: '100%'}}>
        <Flex vertical gap={5} justify={"center"} >
            <span style={SpanCssProperties}><label style={LabelCssProperties}>国家/地区:</label><Tag bordered={false} color="cyan">
                    {countryName}
                </Tag></span>
            <span style={SpanCssProperties}><label style={LabelCssProperties}>国家/地区代码:</label><Tag bordered={false} color="cyan">
                    {countryCode}
                </Tag></span>
            <span style={SpanCssProperties}><label style={LabelCssProperties}>组织:</label><Tag bordered={false} color="cyan">
                    {org}
                </Tag></span>
            <span style={SpanCssProperties}><label style={LabelCssProperties}>ASN:</label><Tag bordered={false} color="cyan">
                    {asn}
                </Tag></span>
            <span style={SpanCssProperties}><label style={LabelCssProperties}>最后更新时间:</label><Tag bordered={false} color="cyan">
                    {updateTime}
                </Tag></span>
            <span style={SpanCssProperties}><label style={LabelCssProperties}>协议({uniqueProtocol?.length || 0}):</label>{uniqueProtocol?.map((i,index)=>{
                return <Tag key={index} bordered={false} color="cyan">
                    {i}
                </Tag>
            })}</span>
            <span style={SpanCssProperties}><label style={LabelCssProperties}>域名({domain.length || 0}):</label>{domain.map((i,index)=>{
                return <Tag key={index} bordered={false} color="cyan">
                    {i}
                </Tag>
            })}</span>
            <span style={SpanCssProperties}><label style={LabelCssProperties}>端口({ports?.length || 0}):</label>{ports?.map((i,index)=>{
                return <Tag key={index} bordered={false} color="cyan">
                    {i}
                </Tag>
            })}</span>
        </Flex>
        <div style={{height: '100%', width: '100%', flex: 1}}>
            <AgGridReact
                loading={loading}
                embedFullWidthRows
                rowData={pageData}
                columnDefs={columnDefs}
                sideBar={defaultSideBarDef}
                headerHeight={32}
                rowHeight={32}
                defaultColDef={defaultColDef}
                noRowsOverlayComponent={() => <NotFound />}
                loadingOverlayComponent={() => <Loading />}
            />
        </div>
    </Flex>
})

const Test: React.FC = () => {

    return  <Flex style={{height:'100%'}} vertical>
        <Aiqicha />
    </Flex>
};

export default Test;
