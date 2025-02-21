import React, { useState } from 'react';
import { Card, Row, Col, Typography, Select, Button, message, Steps, Modal, QRCode, Result } from 'antd';
import { metroLines, calculatePrice } from './data/metroData';
import { findTransferPath } from './utils/routePlanner';

const { Title, Text } = Typography;
const { Option } = Select;

const App = () => {
  const [startStation, setStartStation] = useState(null);
  const [endStation, setEndStation] = useState(null);
  const [price, setPrice] = useState(0);
  const [transferGuide, setTransferGuide] = useState(null);
  const [selectedStartLine, setSelectedStartLine] = useState(null);
  const [selectedEndLine, setSelectedEndLine] = useState(null);

  // 获取所有线路列表
  const getLines = () => {
    return metroLines.map(line => ({
      id: line.id,
      name: line.name
    }));
  };

  // 根据线路获取站点列表
  const getStationsByLine = (lineId) => {
    const line = metroLines.find(line => line.id === lineId);
    if (!line) return [];
    return line.stations.map(station => ({
      id: station.id,
      name: station.name,
      line: line.name,
      transfer: station.transfer
    }));
  };

  const handleStartLineChange = (value) => {
    setSelectedStartLine(value);
    setStartStation(null);
  };

  const handleEndLineChange = (value) => {
    setSelectedEndLine(value);
    setEndStation(null);
  };

  // 获取所有站点列表
  const getAllStations = () => {
    const stations = [];
    metroLines.forEach(line => {
      line.stations.forEach(station => {
        stations.push({
          id: station.id,
          name: station.name,
          line: line.name,
          transfer: station.transfer
        });
      });
    });
    return stations;
  };

  const handleStartStationChange = (value) => {
    setStartStation(value);
    if (value && endStation) {
      const result = findTransferPath(metroLines, value, endStation);
      setTransferGuide(result);
      if (result.success) {
        const calculatedPrice = calculatePrice(result.totalStations);
        setPrice(calculatedPrice);
      }
    }
  };

  const handleEndStationChange = (value) => {
    setEndStation(value);
    if (startStation && value) {
      const result = findTransferPath(metroLines, startStation, value);
      setTransferGuide(result);
      if (result.success) {
        const calculatedPrice = calculatePrice(result.totalStations);
        setPrice(calculatedPrice);
      }
    }
  };

  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [isPaymentSuccess, setIsPaymentSuccess] = useState(false);
  const [countdown, setCountdown] = useState(45);
  const [countdownTimer, setCountdownTimer] = useState(null);

  const handlePurchase = () => {
    if (!startStation || !endStation) {
      message.error('请选择起始站和终点站');
      return;
    }
    setIsPaymentModalVisible(true);
    setCountdown(45);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsPaymentModalVisible(false);
          message.warning('支付超时，请重新发起支付');
          return 45;
        }
        return prev - 1;
      });
    }, 1000);
    setCountdownTimer(timer);
  };

  const handlePaymentModalClose = () => {
    setIsPaymentModalVisible(false);
    if (countdownTimer) {
      clearInterval(countdownTimer);
      setCountdownTimer(null);
    }
    setCountdown(45);
  };

  const handlePaymentScanned = () => {
    setIsPaymentConfirmed(true);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentSuccess(true);
    message.success('购票成功！');
  };

  const handlePaymentComplete = () => {
    setIsPaymentModalVisible(false);
    setIsPaymentConfirmed(false);
    setIsPaymentSuccess(false);
  };

  const allStations = getAllStations();

  return (
    <div style={{ padding: '20px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card>
        <Title level={2} style={{ textAlign: 'center', marginBottom: '24px' }}>武汉地铁购票系统</Title>
        
        <Row gutter={[16, 24]}>
          <Col span={24}>
            <Text strong>选择起始线路：</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="请选择起始线路"
              onChange={handleStartLineChange}
              value={selectedStartLine}
            >
              {getLines().map(line => (
                <Option key={line.id} value={line.id}>
                  {line.name}
                </Option>
              ))}
            </Select>
          </Col>

          <Col span={24}>
            <Text strong>选择起始站：</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="请选择起始站"
              onChange={handleStartStationChange}
              value={startStation}
              showSearch
              optionFilterProp="children"
              disabled={!selectedStartLine}
            >
              {getStationsByLine(selectedStartLine).map(station => (
                <Option key={station.id} value={station.id}>
                  {station.name} {station.transfer ? '(换乘站)' : ''}
                </Option>
              ))}
            </Select>
          </Col>

          <Col span={24}>
            <Text strong>选择终点线路：</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="请选择终点线路"
              onChange={handleEndLineChange}
              value={selectedEndLine}
            >
              {getLines().map(line => (
                <Option key={line.id} value={line.id}>
                  {line.name}
                </Option>
              ))}
            </Select>
          </Col>

          <Col span={24}>
            <Text strong>选择终点站：</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="请选择终点站"
              onChange={handleEndStationChange}
              value={endStation}
              showSearch
              optionFilterProp="children"
              disabled={!selectedEndLine}
            >
              {getStationsByLine(selectedEndLine).map(station => (
                <Option key={station.id} value={station.id}>
                  {station.name} {station.transfer ? '(换乘站)' : ''}
                </Option>
              ))}
            </Select>
          </Col>

          {transferGuide?.success && (
            <Col span={24} style={{ textAlign: 'center' }}>
              <Card style={{ background: '#f6ffed', marginBottom: '16px' }}>
                <Title level={4} style={{ marginBottom: '16px' }}>乘车路线</Title>
                <Steps
                  direction="vertical"
                  items={transferGuide.guide.map((segment, index) => ({
                    title: segment.line,
                    description: (
                      <div>
                        {segment.stations.map((station, i) => (
                          <span key={station.id}>
                            {station.name}
                            {i < segment.stations.length - 1 ? ' → ' : ''}
                          </span>
                        ))}
                      </div>
                    )
                  }))}
                />
                <Title level={3} style={{ color: '#52c41a', margin: '16px 0 0' }}>
                  总站数：{transferGuide.totalStations} 站 | 票价：{price} 元
                </Title>
              </Card>
              <Button type="primary" size="large" onClick={handlePurchase}>
                确认购票
              </Button>
            </Col>
          )}
        </Row>
      </Card>
      <Modal
        title="支付确认"
        open={isPaymentModalVisible}
        onCancel={handlePaymentModalClose}
        footer={null}
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {isPaymentSuccess ? (
            <Result
              status="success"
              title="支付成功"
              subTitle="感谢您使用武汉地铁购票系统"
              extra={[
                <Button type="primary" key="complete" onClick={handlePaymentComplete}>
                  完成
                </Button>
              ]}
            />
          ) : isPaymentConfirmed ? (
            <Row gutter={[0, 24]}>
              <Col span={24}>
                <Title level={4}>请在手机上确认支付</Title>
                <div style={{ marginBottom: '16px' }}>
                  <Text>已扫描成功，请在手机上确认支付</Text>
                </div>
              </Col>
              <Col span={24}>
                <Button type="primary" onClick={handlePaymentSuccess} style={{ marginRight: '8px' }}>
                  模拟手机确认
                </Button>
                <Button onClick={handlePaymentModalClose}>
                  取消
                </Button>
              </Col>
            </Row>
          ) : (
            <Row gutter={[0, 24]}>
              <Col span={24}>
                <Title level={4}>订单信息</Title>
                {transferGuide?.success && (
                  <div style={{ marginBottom: '16px' }}>
                    <Text>起点站：{allStations.find(s => s.id === startStation)?.name}</Text>
                    <br />
                    <Text>终点站：{allStations.find(s => s.id === endStation)?.name}</Text>
                    <br />
                    <Text>总站数：{transferGuide.totalStations} 站</Text>
                    <br />
                    <Text strong style={{ fontSize: '16px' }}>票价：{price} 元</Text>
                  </div>
                )}
              </Col>
              <Col span={24}>
                <Title level={4}>扫码支付</Title>
                <div style={{ marginTop: '16px', marginBottom: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="warning" style={{ fontSize: '16px' }}>二维码有效时间：{countdown}秒</Text>
                  </div>
                  <QRCode
                    value={`https://example.com/pay?price=${price}&from=${startStation}&to=${endStation}`}
                    size={200}
                    style={{ margin: '0 auto' }}
                  />
                </div>
              </Col>
              <Col span={24}>
                <Button type="primary" onClick={handlePaymentScanned} style={{ marginRight: '8px' }}>
                  模拟扫码
                </Button>
                <Button onClick={handlePaymentModalClose}>
                  取消
                </Button>
              </Col>
            </Row>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default App;