// ConnectorWidget.js
// An interface component with a picker and two buttons that handles connection to Muse devices

import React, { Component } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  DeviceEventEmitter,
  StyleSheet,
  PermissionsAndroid,
  Modal,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { MediaQueryStyleSheet } from "react-native-responsive";
import config from "../../redux/config";
import Connector from "../../interface/Connector";
import WhiteButton from "../WhiteButton";
import Button from "../Button.js";
import SandboxButton from "../SandboxButton.js";
import I18n from "../../i18n/i18n";

class MusesPopUp extends Component {
  constructor(props) {
    super(props);
  }

  renderRow(muse, index) {
    return (
      <TouchableOpacity
        key={index}
        onPress={() => {
          this.props.onPress(index);
        }}
      >
        <View
          style={
            this.props.selectedMuse === index
              ? { backgroundColor: "#459acc" }
              : {}
          }
        >
          <View style={styles.item}>
            <View style={styles.label}>
              <Text style={styles.itemText}>
                {index + 1}.
              </Text>
            </View>
            <View style={styles.value}>
              <Text style={styles.itemText}>
                {muse.name}
              </Text>
            </View>
            <Text style={styles.itemText}>
              Model: {muse.model}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  render() {
    return (
      <Modal
        animationType={"fade"}
        transparent={true}
        onRequestClose={this.props.onClose}
        visible={this.props.visible}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalInnerContainer}>
            <Text style={styles.modalTitle}>Available Muses</Text>
            <ScrollView contentContainerStyle={styles.scrollViewContainer}>
              {this.props.availableMuses.map((muse, i) => {
                return this.renderRow(muse, i);
              })}
            </ScrollView>
            <View style={{ flexDirection: "row" }}>
              <View style={{ flex: 1 }}>
                <Button
                  onPress={() =>
                    Connector.connectToMuseWithIndex(this.props.selectedMuse)}
                >
                  {I18n.t("connectButton")}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button onPress={this.props.onClose}>
                  {I18n.t("closeButton")}
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button onPress={() =>
                  Connector.refreshMuseList()}>
                  REFRESH LIST
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }
}

export default class ConnectorWidget extends Component {
  constructor(props) {
    super(props);

    this.state = {
      musePopUpIsVisible: false,
      selectedMuse: 0
    };
  }

  // Checks if user has enabled coarse location permission neceessary for BLE function
  // If not, displays request popup, otherwise proceeds to startConnector()
  async requestLocationPermission() {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        {
          title: I18n.t("needsPermission"),
          message: I18n.t("requiresLocation")
        }
      );
    } catch (err) {
      console.warn(err);
    }
  }

  // Calls getAndConnectoToDevice in native ConnectorModule after creating promise listeners
  startConnector() {
    if (
      this.props.connectionStatus === config.connectionStatus.NOT_YET_CONNECTED
    ) {
      Connector.init();

      DeviceEventEmitter.addListener("CONNECTION_CHANGED", params => {
        console.log('CONNECTION_CHANGED ' + JSON.stringify(params));
        switch (params.connectionStatus) {
          case "CONNECTED":
            this.props.setConnectionStatus(config.connectionStatus.CONNECTED);
            break;

          case "CONNECTING":
            this.props.setConnectionStatus(config.connectionStatus.CONNECTING);
            break;

          case "DISCONNECTED":
          default:
            this.props.setConnectionStatus(
              config.connectionStatus.DISCONNECTED
            );
            break;
        }
      });
    }

    DeviceEventEmitter.addListener("MUSE_LIST_CHANGED", params => {
     console.log('MUSE_CHANGED ' + JSON.stringify(params));
     this.props.setAvailableMuses(params);
   });
  }

  // request location permissions and call getAndConnectToDevice and register event listeners when component loads
  componentDidMount() {
    this.requestLocationPermission();
    this.startConnector();
  }

  componentWillUnmount() {
    DeviceEventEmitter.removeListener("MUSE_LIST_CHANGED", params => {
     console.log('MUSE_CHANGED ' + JSON.stringify(params));
     this.props.setAvailableMuses(params);
   });
  }

  getAndConnectToDevice() {
    this.props.setConnectionStatus(config.connectionStatus.SEARCHING);
    this.props.getMuses().then(action => {
      if (action.payload.length > 1) {
        this.setState({ musePopUpIsVisible: true });
      } else if (action.payload.length === 1) {
        Connector.connectToMuseWithIndex(0);
      } else {
        this.props.setConnectionStatus(config.connectionStatus.NO_MUSES);
      }
    });
  }

  render() {
    switch (this.props.connectionStatus) {
      case config.connectionStatus.NOT_YET_CONNECTED:
      case config.connectionStatus.DISCONNECTED:
      case config.connectionStatus.NO_MUSES:
        return (
          <View style={styles.container}>
            <Text style={styles.noMuses}>No connected Muse</Text>
            <SandboxButton
              onPress={() =>
                this.props.setOfflineMode(!this.props.isOfflineMode)}
              active={this.props.isOfflineMode}
            >
              Enable Offline Mode (beta)
            </SandboxButton>

            <WhiteButton onPress={() => this.getAndConnectToDevice()}>
              SEARCH
            </WhiteButton>
          </View>
        );

      case config.connectionStatus.SEARCHING:
        return (
          <View style={styles.container}>
            <MusesPopUp
              onPress={index => this.setState({ selectedMuse: index })}
              selectedMuse={this.state.selectedMuse}
              visible={this.state.musePopUpIsVisible}
              onClose={() => {
                this.props.setConnectionStatus(
                  config.connectionStatus.DISCONNECTED
                );
                this.setState({ musePopUpIsVisible: false });
              }}
              availableMuses={this.props.availableMuses}
            />
            <View style={[styles.textContainer, { flexDirection: "row" }]}>
              <Text style={styles.connecting}>Searching...</Text>
              <ActivityIndicator color={"#94DAFA"} size={"large"} />
            </View>
          </View>
        );

      case config.connectionStatus.CONNECTED:
        return (
          <View style={styles.textContainer}>
            <Text style={styles.connected}>Connected</Text>
          </View>
        );
    }
    return (
      <View style={styles.textContainer}>
        <Text style={dynamicTextStyle}>
          {connectionString}
        </Text>
      </View>
    );
  }
}

const styles = MediaQueryStyleSheet.create(
  // Base styles
  {
    container: {
      flex: 2.5,
      flexDirection: "column",
      justifyContent: "space-around",
      alignItems: "center",
      marginLeft: 50,
      marginRight: 50
    },

    buttonContainer: {
      flex: 1,
      margin: 40,
      justifyContent: "center"
    },

  textContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: 50,
    margin: 40,
    padding: 5,
    backgroundColor: "#ffffff",
    borderRadius: 50
  },

  body: {
    fontFamily: "Roboto-Light",
    fontSize: 15,
    marginBottom: 5,
    color: "#ffffff",
    textAlign: "center"
  },

  connected: {
    fontFamily: "Roboto-Light",
    fontSize: 20,
    color: "#0ef357"
  },

  disconnected: {
    fontFamily: "Roboto-Light",
    fontSize: 20,
    color: "#f3410e",
    textAlign: "center"
  },

  noMuses: {
    fontFamily: "Roboto-Light",
    fontSize: 20,
    color: "#ffffff",
    textAlign: "center"
  },

  connecting: {
    fontFamily: "Roboto-Light",
    fontSize: 20,
    color: "#42f4d9"
  }
);
