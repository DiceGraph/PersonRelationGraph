import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layout, Space, Input, Tag, Tooltip, Empty, Button, Modal } from 'antd';
import { blue, geekblue } from '@ant-design/colors';
import {
  SyncOutlined,
  QuestionCircleOutlined,
  GithubOutlined,
} from '@ant-design/icons';
import G6 from '@antv/g6';
import { createNodeFromReact, Rect, Circle, Text } from '@antv/g6-react-node';
import './index.less';

const RelNode = ({ cfg = {} }) => {
  return (
    <Rect style={{ alignItems: 'center' }}>
      <Circle
        keyShape
        style={{
          r: 12,
          stroke: blue.primary,
          fill: cfg.level === 0 ? geekblue[5] : blue[1],
          margin: 12,
        }}
        draggable
      >
        {cfg.level && (
          <Rect
            style={{
              fill: geekblue[Math.min(cfg.level, 5)],
              width: 36,
              padding: 4,
              alignItems: 'center',
              margin: [-12, 0, 0, -36],
              radius: 4,
            }}
          >
            <Text
              style={{ fill: cfg.level > 3 ? '#fff' : '#000', fontSize: 10 }}
            >
              第{cfg.level || '0'}度
            </Text>
          </Rect>
        )}
        {cfg.hasChildren && (
          <Circle
            style={{
              cursor: 'pointer',
              fill: geekblue.primary,
              r: 6,
              padding: 4,
              alignItems: 'center',
              justifyContent: 'center',
              margin: [12, 0, 0, 36],
              radius: 4,
            }}
            class="expand"
          >
            <Text
              class="expand"
              style={{ fill: '#fff', fontSize: 10, cursor: 'pointer' }}
            >
              {cfg.expanded ? '-' : '+'}
            </Text>
          </Circle>
        )}
      </Circle>
      <Text style={{ fill: '#000' }}>{cfg.label}</Text>
    </Rect>
  );
};

G6.registerNode('rel', {
  ...createNodeFromReact(RelNode),
  getAnchorPoints: () => [[0.5, 0.5]],
});

const SearchOptions = ({ names = [], setSearchName }) => {
  const [keywords, setKeywords] = useState('');

  return (
    <>
      <Input
        value={keywords}
        placeholder="输入人名关键字查询"
        style={{ width: 200 }}
        onChange={({ target: { value } }) => {
          setKeywords(value);
        }}
      />
      <Button
        onClick={() => {
          const n = Math.floor(Math.random() * names.length);
          setKeywords(names[n]);
          setSearchName(names[n]);
        }}
      >
        随机一下
      </Button>
      {keywords && (
        <Space align="center" style={{ paddingTop: 10 }}>
          {names
            .filter((e) => e.indexOf(keywords) > -1)
            .slice(0, 4)
            .map((e) => (
              <Tooltip key={e} title={e}>
                <Tag
                  color="blue"
                  onClick={() => {
                    setSearchName(e);
                    setKeywords(e);
                  }}
                  style={{
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    cursor: 'pointer',
                  }}
                >
                  {e}
                </Tag>
              </Tooltip>
            ))}
        </Space>
      )}
    </>
  );
};

const nodeCollapse = (nodes, edges, targetId) => {
  const wait2Clean = [targetId];
  let ns = nodes;
  let es = edges;

  while (wait2Clean.length) {
    const name = wait2Clean.pop();
    ns = ns.filter((e) => {
      if (e.sourceName !== name) {
        return true;
      }
      wait2Clean.push(e.id);
      return false;
    });
    es = es.filter((e) => e.source !== name);
  }

  return {
    ns,
    es,
  };
};

const RelationGraph = (props) => {
  const { data = {}, name } = props;
  const usingData = data[name];
  const el = useRef();

  useEffect(() => {
    if (usingData) {
      const element = el.current;
      const graph = new G6.Graph({
        container: element,
        width: element.clientWidth,
        height: element.clientHeight,
        layout: {
          type: 'force',
          linkDistance: 200,
          collideStrength: 1,
          nodeStrength: -320,
          alpha: 1,
          alphaMin: 0.1,
          nodeSize: 200,
        },
        defaultNode: {
          type: 'rel',
        },
        defaultEdge: {
          type: 'quadratic',
          style: {
            stroke: 'rgba(0, 0, 0, 0.25)',
          },
          labelCfg: {
            autoRotate: true,
          },
        },
        modes: {
          default: ['drag-canvas', 'drag-node'],
        },
      });
      let nodes = [
        {
          id: name,
          label: name,
          size: 60,
          expanded: true,
          level: 0,
          hasChildren: true,
        },
      ];
      let edges = [];

      usingData.forEach((d) => {
        nodes.push({
          id: d.name,
          label: d.name,
          size: 50,
          level: 1,
          sourceName: name,
          hasChildren: data[d.name],
        });
        edges.push({
          source: name,
          target: d.name,
          label: d.rel1,
        });
      });
      G6.Util.processParallelEdges(edges);
      graph.data({ nodes, edges });
      graph.render();
      graph.on('node:dragstart', function (e) {
        graph.layout();
      });
      graph.on('node:drag', function (e) {
        const forceLayout = graph.get('layoutController').layoutMethods[0];
        forceLayout.execute();
      });
      const onclick = function (e) {
        const item = e.item;
        const shape = e.shape;
        const model = item.get('model');
        const name = model.id;

        if (shape.get('class') !== 'expand') {
          return;
        }

        if (!model.expanded) {
          nodes.find((e) => e.id === name).expanded = true;
          if (data[name]) {
            data[name].forEach((d) => {
              if (!nodes.find((e) => e.id === d.name)) {
                nodes.push({
                  id: d.name,
                  label: d.name,
                  size: Math.max(20, model.size - 10),
                  level: model.level + 1,
                  expanded: false,
                  sourceName: name,
                  hasChildren: data[d.name],
                });
              }
              if (
                !edges.find((e) => e.source === name && e.target === d.name)
              ) {
                edges.push({
                  source: name,
                  target: d.name,
                  label: d.rel1,
                });
              }
              G6.Util.processParallelEdges(edges);
              graph.changeData({ nodes, edges });
            });
          }
        } else {
          nodes.find((e) => e.id === name).expanded = false;
          const afterData = nodeCollapse(nodes, edges, name);
          nodes = afterData.ns;
          edges = afterData.es;
          graph.changeData({
            nodes,
            edges,
          });
        }
        setTimeout(() => {
          const forceLayout = graph.get('layoutController').layoutMethods[0];
          forceLayout.execute();
        }, 10);
      };
      graph.on('node:click', onclick);
      graph.on('node:touchstart', onclick);

      return () => {
        graph.destroy();
      };
    }
  }, [name]);

  if (!usingData) {
    return <Empty style={{ margin: 36 }} description="请选择搜索对象" />;
  }

  return <div ref={el} style={{ width: '100%', height: '100%' }}></div>;
};

const openAboutUs = () => {
  Modal.info({
    title: '关于这个项目',
    content: (
      <div>
        <p>
          数据集：{' '}
          <a
            target="_blank"
            href="https://github.com/liuhuanyong/PersonGraphDataSet"
          >
            PersonGraphDataSet
          </a>
        </p>
        <p>
          使用技术：{' '}
          <a target="_blank" href="https://github.com/antvis/g6">
            G6
          </a>
          (图可视化),
          <a target="_blank" href="https://github.com/umijs/umi">
            umi
          </a>
          (脚手架),
          <a target="_blank" href="https://github.com/ant-design/ant-design">
            Ant Design
          </a>
          (UI组件)
        </p>
        <p>项目版本： v0</p>
        <p>本项目仅作为学习参考与讨论呢，数据真实准确性与数据集相关。</p>
      </div>
    ),
  });
};

const App = () => {
  const [data, setData] = useState({});
  const [searchName, setSearchName] = useState('');
  const names = useMemo(() => Object.keys(data), [data]);

  useEffect(() => {
    fetch(
      'https://gw.alipayobjects.com/os/antfincdn/d%24NIkFATzN/relation.json',
    ).then((res) =>
      res.json().then((data) => {
        setData(data);
      }),
    );
  }, []);

  return (
    <Layout style={{ height: '100%' }}>
      <Layout.Header
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          zIndex: 999,
          height: 'fit-content',
        }}
      >
        <div style={{ color: 'white', fontWeight: 'bold', letterSpacing: 2 }}>
          人物知识图谱分析
        </div>
        {data ? (
          <SearchOptions names={names} setSearchName={setSearchName} />
        ) : (
          <span style={{ color: 'white' }}>
            <SyncOutlined spin /> 数据正在加载中
          </span>
        )}
        <div style={{ flex: 1 }}></div>
        <Space>
          <Button ghost shape="circle" onClick={openAboutUs}>
            <QuestionCircleOutlined />
          </Button>
          <Button
            ghost
            shape="circle"
            target="_blank"
            href="https://github.com/DiceGraph/PersonRelationGraph"
          >
            <GithubOutlined />
          </Button>
        </Space>
      </Layout.Header>
      <Layout.Content style={{ flex: 1 }}>
        <RelationGraph name={searchName} data={data} />
      </Layout.Content>
    </Layout>
  );
};

export default App;
