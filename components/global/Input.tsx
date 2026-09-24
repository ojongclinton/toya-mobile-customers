import {StyleSheet, TextInput, View} from "react-native";
import {Colors} from "@/constants/Colors";
import type {PropsWithChildren} from "react";

type Props= PropsWithChildren<{
    type: string|null;
    placeholder: string;
}>

export function Input({children, type, placeholder}: Props) {
    return(
        <View>
            <TextInput
                style={styles.input}
                placeholder={placeholder}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    input: {
        borderColor: Colors.light.tint,
        borderRadius: 10,
        height: 40,
        margin: 12,
        borderWidth: 1,
        padding: 10,
    },
})