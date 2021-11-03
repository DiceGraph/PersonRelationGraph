import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Layout,
  Space,
  Input,
  Tag,
  Tooltip,
  Empty,
  Button,
  Modal,
  Card,
} from 'antd';
import { blue, geekblue } from '@ant-design/colors';
import {
  SyncOutlined,
  QuestionCircleOutlined,
  GithubOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RedoOutlined,
} from '@ant-design/icons';
import G6 from '@antv/g6';
import { createNodeFromReact, Rect, Circle, Text } from '@antv/g6-react-node';
import './index.less';

const LevelTag = ({ level = 0 }) => (
  <Rect
    style={{
      fill: geekblue[Math.min(level, 5)],
      width: 36,
      padding: 4,
      alignItems: 'center',
      margin: [-12, 0, 0, -36],
      radius: 4,
    }}
  >
    <Text style={{ fill: level > 3 ? '#fff' : '#000', fontSize: 10 }}>
      第{level}度
    </Text>
  </Rect>
);

const RelNode = ({ cfg = {} }) => {
  return (
    <Rect style={{ alignItems: 'center' }}>
      <Circle
        keyShape
        style={{
          r: 12,
          stroke: blue.primary,
          fill: cfg.level === 0 ? geekblue[5] : blue.primary,
          margin: 12,
        }}
        draggable
      >
        {cfg.level && <LevelTag level={cfg.level} />}
        {cfg.hasChildren && cfg.level && (
          <Circle
            style={{
              cursor: 'pointer',
              fill: geekblue.primary,
              r: 8,
              padding: 3,
              alignItems: 'center',
              justifyContent: 'center',
              margin: [-2, 0, 0, 4],
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
      <Text class="title" style={{ fill: '#000' }}>
        {cfg.label}
      </Text>
    </Rect>
  );
};

G6.registerNode('rel', {
  ...createNodeFromReact(RelNode),
  getAnchorPoints: () => [[0.5, 0.5]],
});

const SearchOptions = ({ names = [], setSearchName, searchName = '' }) => {
  const [keywords, setKeywords] = useState(searchName);

  useEffect(() => {
    setKeywords(searchName);
  }, [searchName]);

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
  const [nowData, setNowData] = useState({ nodes: [], edges: [] });
  const el = useRef();
  const minimapEl = useRef();
  const graphRef = useRef();

  useEffect(() => {
    if (usingData) {
      const element = el.current;
      const minimap = new G6.Minimap({
        size: [200, 100],
        container: minimapEl.current,
        type: 'keyShape',
      });
      const tooltip = new G6.Tooltip({
        container: document.body,
        fixToNode: [0.5, 0.5],
        itemTypes: ['node'],
        getContent: (evt) => {
          const tooltipEl = document.createElement('div');
          const item = evt.item;
          const model = item.get('model');
          const name = model.id;

          ReactDOM.render(
            <iframe
              style={{ border: 'none', width: 500, height: 300 }}
              src={`https://baike.baidu.com/item/${encodeURIComponent(name)}#1`}
            />,
            tooltipEl,
          );

          return tooltipEl;
        },
        shouldBegin: (evt) => {
          if (evt.shape?.get('class') === 'title') {
            return true;
          }
          return false;
        },
      });
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
          nodeSize: 300,
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
          default: ['drag-canvas', 'drag-node', 'scroll-canvas'],
        },
        plugins: [tooltip, minimap],
      });
      let nodes = [
        {
          id: name,
          label: name,
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
      setNowData({ nodes, edges });
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
        setNowData({ nodes, edges });
        setTimeout(() => {
          const forceLayout = graph.get('layoutController').layoutMethods[0];
          forceLayout.execute();
        }, 10);
      };
      graph.on('node:click', onclick);
      graph.on('node:touchstart', onclick);

      graphRef.current = graph;
      return () => {
        graph.destroy();
      };
    }
  }, [name]);

  if (!usingData) {
    return <Empty style={{ margin: 36 }} description="请选择搜索对象" />;
  }

  return (
    <div
      ref={el}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <Card
        size="small"
        style={{ position: 'absolute', top: 0, margin: 'auto', left: 0 }}
      >
        <Space>
          <span>节点数量 {nowData.nodes.length}</span>
          <span>边数量 {nowData.edges.length}</span>
          <span>
            <Button
              type="link"
              onClick={() => {
                graphRef.current.zoom(1.2);
              }}
            >
              <ZoomInOutlined />
            </Button>
          </span>
          <span>
            <Button
              type="link"
              onClick={() => {
                graphRef.current.zoom(0.8);
              }}
            >
              <ZoomOutOutlined />
            </Button>
          </span>
          <span>
            <Button
              type="link"
              onClick={() => {
                graphRef.current.zoomTo(1);
              }}
            >
              <RedoOutlined />
            </Button>
          </span>
        </Space>
      </Card>
      <div
        ref={minimapEl}
        style={{
          position: 'absolute',
          top: 0,
          margin: 'auto',
          right: 0,
          background: 'white',
        }}
      />
    </div>
  );
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

const App = (props) => {
  const { location, history } = props;
  const [data, setData] = useState({});
  const [searchName, setSearchName] = useState('');
  const names = useMemo(() => Object.keys(data), [data]);
  const queryName = location.query.name;

  useEffect(() => {
    fetch(
      'https://gw.alipayobjects.com/os/antfincdn/d%24NIkFATzN/relation.json',
    ).then((res) =>
      res.json().then((data) => {
        setData(data);
      }),
    );
  }, []);

  useEffect(() => {
    if (searchName !== queryName && data[queryName]) {
      setSearchName(queryName);
    }
  }, [queryName, data]);

  useEffect(() => {
    if (searchName && searchName !== queryName) {
      history.replace(`?name=${searchName}`);
    }
  }, [searchName]);

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
          <SearchOptions
            names={names}
            searchName={searchName}
            setSearchName={setSearchName}
          />
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
